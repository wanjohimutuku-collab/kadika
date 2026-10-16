'use client';

import { useId, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  guestInputSchema,
  type CardKind,
  type GuestInput,
  type GuestInputParsed,
} from '@harusi/schemas';
import { isRepositoryError, type Guest } from '@harusi/api-client';
import { Button } from '@/components/ui/button';
import { Checkbox, PhoneField, Select, TextField, Textarea } from '@/components/ui/form';
import { Stepper } from '@/components/ui/stepper';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { eventScopedKeys, qk } from '@/lib/queries';
import { useFieldError } from '@/lib/use-field-error';
import { formatPhone } from '@/lib/format';
import { CardKindPicker } from './card-kind-picker';

export function guestToInput(g: Guest): GuestInput {
  return {
    displayName: g.displayName,
    phone: g.phoneE164 ? formatPhone(g.phoneE164).slice(1) : '',
    groupLabel: g.groupLabel,
    partySizeAllowed: g.partySizeAllowed,
    cardKind: g.cardKind,
    inviteChannelPref: g.inviteChannelPref,
    hasSmartphone: g.hasSmartphone,
    language: g.language,
    notes: g.notes,
  };
}

const EMPTY: GuestInput = {
  displayName: '',
  phone: '',
  groupLabel: '',
  partySizeAllowed: 1,
  cardKind: 'invitation',
  inviteChannelPref: 'whatsapp',
  hasSmartphone: true,
  language: 'sw',
  notes: '',
};

/** Add or edit one guest. Optimistic list update with rollback toast on failure (§17.10). */
export function GuestForm({
  eventId,
  guest,
  onDone,
  allowAddAnother,
  defaultCardKind,
}: {
  eventId: string;
  guest?: Guest;
  onDone: (g: Guest) => void;
  allowAddAnother?: boolean;
  /** The card type a new guest starts with, for example when the organiser came from "contribution cards". */
  defaultCardKind?: CardKind;
}) {
  const t = useTranslations('guestForm');
  const tc = useTranslations('common');
  const tch = useTranslations('channel');
  const ts = useTranslations('states');
  const tl = useTranslations('common.languageName');
  const fieldError = useFieldError();
  const toast = useToast();
  const queryClient = useQueryClient();
  const listId = useId();
  const groups = useQuery({
    queryKey: qk.groups(eventId),
    queryFn: () => getRepository().listGroups(eventId),
  });
  const form = useForm<GuestInput, unknown, GuestInputParsed>({
    resolver: zodResolver(guestInputSchema),
    defaultValues: guest
      ? guestToInput(guest)
      : { ...EMPTY, cardKind: defaultCardKind ?? 'invitation' },
    mode: 'onTouched',
  });
  const { register, control, handleSubmit, formState, setError, setValue, reset, getValues } = form;
  const hasSmartphone = useWatch({ control, name: 'hasSmartphone' });
  const phone = useWatch({ control, name: 'phone' });
  const cardKind = useWatch({ control, name: 'cardKind' }) ?? 'invitation';

  const save = useMutation({
    mutationFn: (input: GuestInput) =>
      guest
        ? getRepository().updateGuest(guest.id, input)
        : getRepository().createGuest(eventId, input),
    onMutate: async (input) => {
      if (!guest) return;
      // Optimistic edit in the cached list.
      await queryClient.cancelQueries({ queryKey: qk.guests(eventId) });
      const prev = queryClient.getQueryData<Guest[]>(qk.guests(eventId));
      queryClient.setQueryData<Guest[]>(qk.guests(eventId), (list) =>
        list?.map((g) =>
          g.id === guest.id
            ? {
                ...g,
                displayName: input.displayName,
                groupLabel: input.groupLabel ?? '',
                partySizeAllowed: Number(input.partySizeAllowed),
                cardKind: input.cardKind ?? g.cardKind,
              }
            : g,
        ),
      );
      return { prev };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(qk.guests(eventId), ctx.prev);
      if (isRepositoryError(err) && err.code === 'conflict')
        setError('phone', { message: 'duplicate' });
      else toast({ tone: 'error', title: ts('rolledBack') });
    },
    onSuccess: async (g, _input) => {
      toast({ tone: 'success', title: t('saved', { name: g.displayName }) });
      await Promise.all(
        eventScopedKeys(eventId).map((k) => queryClient.invalidateQueries({ queryKey: k })),
      );
      await queryClient.invalidateQueries({ queryKey: qk.guest(g.id) });
    },
  });

  const phoneErr =
    formState.errors.phone?.message === 'duplicate'
      ? t('duplicatePhone')
      : fieldError(formState.errors.phone);
  const addAnother = useRef(false);

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      data-testid="guest-form"
      onSubmit={handleSubmit(async () => {
        // The repository validates and normalises again (E.164), so send the raw form values.
        const v = getValues();
        const g = await save.mutateAsync(v).catch(() => null);
        if (!g) return;
        if (addAnother.current)
          reset({ ...EMPTY, cardKind: v.cardKind ?? 'invitation', groupLabel: v.groupLabel });
        else onDone(g);
      })}
    >
      <CardKindPicker
        name="cardKind"
        testId="guest-card-kind"
        legend={t('cardKind')}
        help={t('cardKindHelp')}
        labels={{
          invitation: t('cardKinds.invitation'),
          contribution: t('cardKinds.contribution'),
        }}
        value={cardKind}
        onChange={(k) => {
          setValue('cardKind', k, { shouldDirty: true });
          // a contribution card has no reply, so there is no party to count
          if (k === 'contribution') setValue('partySizeAllowed', 1);
        }}
      />
      <TextField
        label={t('name')}
        hint={t('nameHint')}
        autoComplete="off"
        {...register('displayName')}
        error={fieldError(formState.errors.displayName)}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneField
            label={t('phone')}
            hint={t('phoneHint')}
            optionalLabel={tc('optional')}
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            error={phoneErr}
          />
        )}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label={t('group')}
          hint={t('groupHint')}
          list={listId}
          optionalLabel={tc('optional')}
          {...register('groupLabel')}
        />
        <datalist id={listId}>
          {(groups.data ?? []).map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        {cardKind === 'invitation' ? (
          <Controller
            control={control}
            name="partySizeAllowed"
            render={({ field }) => (
              <Stepper
                value={Number(field.value)}
                min={1}
                max={10}
                onChange={field.onChange}
                label={t('party')}
                decreaseLabel={t('decrease')}
                increaseLabel={t('increase')}
              />
            )}
          />
        ) : null}
      </div>
      <Controller
        control={control}
        name="hasSmartphone"
        render={({ field }) => (
          <Checkbox
            label={t('noSmartphone')}
            description={t('noSmartphoneHelp')}
            checked={!field.value}
            onChange={(e) => {
              field.onChange(!e.target.checked);
              setValue('inviteChannelPref', e.target.checked ? 'sms' : 'whatsapp');
            }}
          />
        )}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label={t('channel')}
          {...register('inviteChannelPref')}
          options={(phone?.trim()
            ? hasSmartphone
              ? (['whatsapp', 'sms', 'print', 'mixed'] as const)
              : (['sms', 'print'] as const)
            : (['print'] as const)
          ).map((c) => ({ value: c, label: tch(c) }))}
        />
        <Select
          label={t('language')}
          {...register('language')}
          options={[
            { value: 'sw', label: tl('sw') },
            { value: 'en', label: tl('en') },
          ]}
        />
      </div>
      <Textarea label={t('notes')} optionalLabel={tc('optional')} rows={2} {...register('notes')} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {allowAddAnother && !guest ? (
          <Button
            type="submit"
            variant="secondary"
            onClick={() => {
              addAnother.current = true;
            }}
            loading={save.isPending}
          >
            {t('saveAndAdd')}
          </Button>
        ) : null}
        <Button
          type="submit"
          loading={save.isPending}
          loadingLabel={tc('saving')}
          data-testid="guest-save"
          onClick={() => {
            addAnother.current = false;
          }}
        >
          {t('save')}
        </Button>
      </div>
    </form>
  );
}
