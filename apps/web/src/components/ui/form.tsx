'use client';

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Upload } from 'lucide-react';
import type { Country } from '@harusi/schemas/country';
import { COUNTRY_INFO } from '@harusi/schemas/country';
import { formatPhoneInternational } from '@harusi/schemas/phone';
import { dialPrefix, parsePhone, usePhoneCountry } from '@/lib/country';
import { cn } from '@/lib/cn';

const inputBase =
  'block w-full min-h-12 rounded-input border bg-surface px-3 text-base text-ink placeholder:text-muted/80 disabled:bg-bg disabled:text-muted aria-[invalid=true]:border-danger';

export interface FieldShellProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  id: string;
  children: ReactNode;
  className?: string;
}

/** Visible label, hint and inline error wired with aria-describedby (§17.12: no placeholder-only labels). */
export function FieldShell({
  label,
  hint,
  error,
  optionalLabel,
  id,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {optionalLabel ? (
          <span className="ml-1 font-normal text-muted">({optionalLabel})</span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint?: ReactNode, error?: ReactNode): string | undefined {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  optionalLabel?: string;
  ref?: Ref<HTMLInputElement>;
  wrapperClassName?: string;
}

export function TextField({
  label,
  hint,
  error,
  prefix,
  suffix,
  optionalLabel,
  id: idProp,
  className,
  wrapperClassName,
  ref,
  ...rest
}: TextFieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      optionalLabel={optionalLabel}
      id={id}
      className={wrapperClassName}
    >
      <div className={cn('flex items-stretch', (prefix || suffix) && 'rounded-input')}>
        {prefix ? (
          <span className="inline-flex items-center rounded-l-input border border-r-0 border-border bg-bg px-3 font-medium text-muted">
            {prefix}
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(
            inputBase,
            error ? 'border-danger' : 'border-border',
            prefix && 'rounded-l-none',
            suffix && 'rounded-r-none',
            className,
          )}
          {...rest}
        />
        {suffix ? (
          <span className="inline-flex items-center rounded-r-input border border-l-0 border-border bg-bg px-3 text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  label,
  hint,
  error,
  optionalLabel,
  id: idProp,
  className,
  ref,
  ...rest
}: TextareaProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} optionalLabel={optionalLabel} id={id}>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(
          inputBase,
          'min-h-24 py-2.5',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...rest}
      />
    </FieldShell>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: { value: string; label: string }[];
  ref?: Ref<HTMLSelectElement>;
}

/** Native select: the most reliable and accessible control on low-end Android browsers. */
export function Select({
  label,
  hint,
  error,
  options,
  id: idProp,
  className,
  ref,
  ...rest
}: SelectProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} id={id}>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(
          inputBase,
          'appearance-auto pr-8',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ref,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode;
  description?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  return (
    <div className={cn('flex min-h-12 items-start gap-3 py-1', className)}>
      <input
        ref={ref}
        id={rest.id ?? id}
        type="checkbox"
        className="mt-0.5 size-6 shrink-0 accent-[var(--hp-primary)]"
        aria-describedby={description ? `${id}-d` : undefined}
        {...rest}
      />
      <label htmlFor={rest.id ?? id} className="flex flex-col">
        <span className="font-medium">{label}</span>
        {description ? (
          <span id={`${id}-d`} className="text-sm text-muted">
            {description}
          </span>
        ) : null}
      </label>
    </div>
  );
}

// ------------------------------------------------------------------ PhoneField

export interface PhoneFieldProps extends Omit<
  TextFieldProps,
  'onChange' | 'value' | 'prefix' | 'type'
> {
  value: string;
  onChange: (raw: string) => void;
  /** Called with E.164 when the value is a valid mobile number, else null. */
  onE164?: (e164: string | null) => void;
  /** Country local numbers are read in; defaults to the open event's (else Tanzania). */
  country?: Country;
}

/**
 * Phone input with the country's dial-code prefix (+255 by default). Accepts 0712…, 712…, +255… or
 * 255…; on blur it shows the national form (712 345 678), or the international form for a number
 * from another allowed country. Storage is always E.164 (§5).
 */
export function PhoneField({
  value,
  onChange,
  onE164,
  onBlur,
  country,
  hint,
  ...rest
}: PhoneFieldProps) {
  const fromContext = usePhoneCountry();
  const home = country ?? fromContext;
  /** How a valid number sits in the box: without the dial code at home (712 345 678), whole when abroad. */
  const show = (e164: string) => {
    const dial = COUNTRY_INFO[home].dial;
    if (!e164.startsWith(`+${dial}`)) return e164;
    const n = e164.slice(dial.length + 1);
    return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  };
  const handle = (raw: string) => {
    onChange(raw);
    const r = parsePhone(raw, home);
    onE164?.(r.ok ? r.e164 : null);
  };
  // When what was typed is not already the clean form, say how it was understood. The line stays
  // after blur tidies the number, so the layout below does not jump under a tap that blurred it.
  const [tidied, setTidied] = useState<string | null>(null);
  const parsed = parsePhone(value, home);
  const understood =
    parsed.ok && (value.trim() !== show(parsed.e164) || tidied === parsed.e164)
      ? formatPhoneInternational(parsed.e164)
      : null;
  return (
    <TextField
      {...rest}
      prefix={dialPrefix(home)}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      hint={
        understood ? (
          <>
            {hint}
            {hint ? ' ' : null}
            <span className="block font-medium text-success" data-testid="phone-understood">
              ✓ {understood}
            </span>
          </>
        ) : (
          hint
        )
      }
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => handle(e.target.value)}
      // Pasting a whole number in any shape (+255 (0) 712…, a wa.me link, "Simu: 0712…") tidies it at once.
      onPaste={(e) => {
        const r = parsePhone(e.clipboardData.getData('text'), home);
        if (r.ok) {
          e.preventDefault();
          handle(show(r.e164));
        }
      }}
      onBlur={(e) => {
        const r = parsePhone(value, home);
        if (r.ok && value.trim() !== show(r.e164)) {
          setTidied(r.e164);
          onChange(show(r.e164));
        }
        onBlur?.(e);
      }}
    />
  );
}

// ------------------------------------------------------------------ OtpField

export interface OtpFieldProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  label: string;
  cellLabel: (index: number) => string;
  error?: ReactNode;
  disabled?: boolean;
}

/** 6 cells, auto-advance, paste-to-fill and SMS autofill (`autocomplete="one-time-code"`). */
export function OtpField({
  length = 6,
  value,
  onChange,
  onComplete,
  label,
  cellLabel,
  error,
  disabled,
}: OtpFieldProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const id = useId();
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  const set = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };
  const onInput = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value.replace(/\D/g, '');
    if (!typed) return;
    if (typed.length > 1) {
      // SMS autofill or paste into one cell.
      set(typed);
      refs.current[Math.min(typed.length, length - 1)]?.focus();
      return;
    }
    const next = (value.slice(0, i) + typed + value.slice(i + 1)).slice(0, length);
    set(next);
    refs.current[Math.min(i + 1, length - 1)]?.focus();
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[i]) set(value.slice(0, i) + value.slice(i + 1));
      else if (i > 0) {
        set(value.slice(0, i - 1) + value.slice(i));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    set(e.clipboardData.getData('text'));
  };
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? `${id}-e` : undefined}>
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      <div className="flex gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChange={(e) => onInput(i, e)}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            maxLength={length}
            disabled={disabled}
            aria-label={cellLabel(i)}
            aria-invalid={error ? true : undefined}
            className={cn(
              'tabular h-14 w-full min-w-0 max-w-14 rounded-input border bg-surface text-center text-2xl font-semibold',
              error ? 'border-danger' : 'border-border',
            )}
          />
        ))}
      </div>
      {error ? (
        <p id={`${id}-e`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

// ------------------------------------------------------------------ FilePicker

export function FilePicker({
  label,
  hint,
  accept,
  onFile,
  buttonLabel,
  error,
}: {
  label: string;
  hint?: ReactNode;
  accept: string;
  onFile: (f: File) => void;
  buttonLabel: string;
  error?: ReactNode;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed p-6 text-center transition-colors',
          over ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-bg',
          error && 'border-danger',
        )}
      >
        <Upload className="size-7 text-primary" aria-hidden="true" />
        <span className="font-semibold">{label}</span>
        {hint ? <span className="text-sm text-muted">{hint}</span> : null}
        <span className="mt-1 inline-flex min-h-12 items-center rounded-input bg-primary px-4 font-semibold text-on-primary">
          {buttonLabel}
        </span>
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
