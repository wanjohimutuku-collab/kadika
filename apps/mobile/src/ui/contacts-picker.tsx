import { memo, useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import type { ContactLite } from '@harusi/schemas/import';
import { useT } from '../lib/i18n';
import { useColors } from '../lib/theme';
import { Icon } from './icons';
import { Button, SearchBox, Txt } from './kit';

const ContactRow = memo(function ContactRow({
  contact,
  checked,
  onToggle,
  noPhone,
}: {
  contact: ContactLite;
  checked: boolean;
  onToggle: () => void;
  noPhone: string;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={contact.name}
      onPress={onToggle}
      style={{
        minHeight: 60,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderColor: c.border,
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: checked ? c.primary : c.muted,
          backgroundColor: checked ? c.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="check" size={18} color={c.onPrimary} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Txt bold>{contact.name}</Txt>
        <Txt size={14} color={c.muted}>
          {contact.phone || noPhone}
        </Txt>
      </View>
    </Pressable>
  );
});

/** Searchable multi-select over the phone's contacts (ADR 051). Nobody is preselected. */
export function ContactsPicker({
  contacts,
  picked,
  onChange,
  query,
  onQuery,
}: {
  contacts: ContactLite[];
  picked: Set<number>;
  onChange: (next: Set<number>) => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  const t = useT();
  const c = useColors();
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return contacts
      .map((contact, i) => ({ contact, i }))
      .filter(
        ({ contact }) =>
          !q ||
          contact.name.toLowerCase().includes(q) ||
          (digits.length >= 3 && contact.phone.replace(/\D/g, '').includes(digits)),
      );
  }, [contacts, query]);
  const toggle = (i: number) => {
    const n = new Set(picked);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    onChange(n);
  };
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <SearchBox label={t('contacts.search')} value={query} onChangeText={onQuery} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flex: 1 }}>
          <Txt size={14} color={c.muted}>
            {t('contacts.selected', { count: picked.size })}
          </Txt>
        </View>
        <Button
          variant="ghost"
          label={t('contacts.selectAll', { count: visible.length })}
          onPress={() => onChange(new Set([...picked, ...visible.map(({ i }) => i)]))}
        />
        {picked.size ? (
          <Button
            variant="ghost"
            label={t('contacts.selectNone')}
            onPress={() => onChange(new Set())}
          />
        ) : null}
      </View>
      <FlatList
        style={{ flex: 1 }}
        data={visible}
        keyExtractor={({ i }) => String(i)}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        windowSize={7}
        renderItem={({ item }) => (
          <ContactRow
            contact={item.contact}
            checked={picked.has(item.i)}
            onToggle={() => toggle(item.i)}
            noPhone={t('guests.noPhone')}
          />
        )}
        ListEmptyComponent={
          <Txt color={c.muted} style={{ textAlign: 'center', paddingVertical: 24 } as never}>
            {contacts.length ? t('contacts.noMatch') : t('contacts.empty')}
          </Txt>
        }
      />
    </View>
  );
}
