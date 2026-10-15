import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, spacing, useColors } from '../lib/theme';
import { Icon, type IconName } from './icons';
import { useT } from '../lib/i18n';

/** Touch targets are at least 48 dp (§17.1). */
const MIN = 48;

export function Screen({
  children,
  scroll = true,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
}) {
  const c = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['left', 'right']}>
      {/* Android is edge-to-edge here, so the keyboard would cover the footer without this. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {scroll ? (
          <ScrollView
            contentContainerStyle={{
              padding: spacing.lg,
              gap: spacing.md,
              paddingBottom: spacing.xxxl,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>{children}</View>
        )}
        {footer ? (
          <View
            style={{
              padding: spacing.lg,
              borderTopWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bg,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Txt({
  children,
  size = 16,
  bold,
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  bold?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontSize: size, color: color ?? c.ink, fontWeight: bold ? '700' : '400' },
        style as never,
      ]}
    >
      {children}
    </Text>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg =
    variant === 'primary'
      ? c.primary
      : variant === 'danger'
        ? c.danger
        : variant === 'secondary'
          ? c.surface
          : 'transparent';
  const fg = variant === 'primary' ? c.onPrimary : variant === 'danger' ? '#FFFFFF' : c.primary;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 52,
          borderRadius: 14,
          backgroundColor: bg,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          borderColor: variant === 'secondary' ? c.primary : 'transparent',
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          opacity: off ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : icon ? (
        <Icon name={icon} size={20} color={fg} />
      ) : null}
      <Text style={{ color: fg, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  hint,
  ...input
}: { label: string; error?: string | null; hint?: string } & TextInputProps) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.xs }}>
      <Txt size={14} bold>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...input}
        style={{
          minHeight: MIN,
          fontSize: 16, // inputs never below 16 (§17.2)
          color: c.ink,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: error ? c.danger : c.border,
          borderRadius: radius.input,
          paddingHorizontal: spacing.md,
        }}
      />
      {hint && !error ? (
        <Txt size={14} color={c.muted}>
          {hint}
        </Txt>
      ) : null}
      {error ? (
        <Txt size={14} color={c.danger}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  style,
  tone = 'plain',
  onPress,
  label,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** `brand` is the emerald hero card; `soft` a quiet tinted one. */
  tone?: 'plain' | 'brand' | 'soft';
  onPress?: () => void;
  label?: string;
}) {
  const c = useColors();
  const body = (
    <View
      style={[
        {
          backgroundColor: tone === 'brand' ? c.primary : tone === 'soft' ? c.bg : c.surface,
          borderRadius: 16,
          borderWidth: tone === 'brand' ? 0 : 1,
          borderColor: c.border,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function Row({
  children,
  onPress,
  label,
}: {
  children: ReactNode;
  onPress?: () => void;
  label?: string;
}) {
  const c = useColors();
  const body = (
    <View
      style={{
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderColor: c.border,
      }}
    >
      {children}
      {onPress ? <Icon name="next" size={18} color={c.muted} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

const AVATAR_COLORS = ['#0F5C4D', '#1D4E89', '#8A3B12', '#6B2D5C', '#2F6B3A', '#7A4A00'];
export function Avatar({ text, size = 44, seed }: { text: string; size?: number; seed?: string }) {
  let h = 0;
  for (const ch of seed ?? text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: AVATAR_COLORS[h % AVATAR_COLORS.length],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: size * 0.38 }}>{text}</Text>
    </View>
  );
}

const TONES = {
  neutral: 'muted',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
} as const;
const PILL_ICON = {
  neutral: 'clock',
  success: 'check',
  warning: 'warn',
  danger: 'close',
  info: 'check',
} as const;
/** Colour is never the only signal: the pill always has a word and an icon (§17.12). */
export function Pill({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: keyof typeof TONES;
  icon?: IconName;
}) {
  const c = useColors();
  const color = c[TONES[tone]];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: color + '1F',
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Icon name={icon ?? PILL_ICON[tone]} size={13} color={color} strokeWidth={2.5} />
      <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={{
        minHeight: 40,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? c.primary : c.border,
        backgroundColor: active ? c.primary : c.surface,
      }}
    >
      <Text style={{ color: active ? c.onPrimary : c.ink, fontSize: 14, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          active={o.value === value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </View>
  );
}

export function Banner({
  text,
  tone = 'info',
}: {
  text: string;
  tone?: 'info' | 'warning' | 'danger' | 'success';
}) {
  const c = useColors();
  const icon: IconName = tone === 'success' ? 'checkCircle' : tone === 'info' ? 'shield' : 'warn';
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'flex-start',
        backgroundColor: c[tone] + '1A',
        padding: spacing.md,
        borderRadius: 12,
      }}
    >
      <Icon name={icon} size={20} color={c[tone]} />
      <View style={{ flex: 1 }}>
        <Txt size={14}>{text}</Txt>
      </View>
    </View>
  );
}

export function Skeleton({ height = 56 }: { height?: number }) {
  const c = useColors();
  return (
    <View style={{ height, borderRadius: radius.card, backgroundColor: c.border, opacity: 0.6 }} />
  );
}

export function EmptyState({
  text,
  action,
  icon = 'guests',
}: {
  text: string;
  action?: { label: string; onPress: () => void };
  icon?: IconName;
}) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, padding: spacing.xl }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: c.primary + '14',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={32} color={c.primary} />
      </View>
      <Txt style={{ textAlign: 'center' } as never}>{text}</Txt>
      {action ? <Button label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

/** Plain-language error with a retry and a small code (§17.10). Never a stack trace. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useT();
  const code = (error as { code?: string } | null)?.code ?? 'server';
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, padding: spacing.xl }}>
      <Txt bold size={20}>
        {t('states.errorTitle')}
      </Txt>
      <Txt style={{ textAlign: 'center' } as never}>{t('states.errorBody')}</Txt>
      {onRetry ? <Button label={t('common.retry')} onPress={onRetry} /> : null}
      <Txt size={14} color="#5F6368">
        {t('common.errorCode', { code })}
      </Txt>
    </View>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const c = useColors();
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* the sheet rides above the keyboard so its buttons stay tappable on Android */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000066' }}
          onPress={onClose}
          accessibilityLabel="close"
        />
        <View
          style={{
            backgroundColor: c.bg,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: spacing.lg,
            gap: spacing.md,
            maxHeight: '85%',
          }}
        >
          <Txt bold size={20}>
            {title}
          </Txt>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: spacing.md }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Destructive actions always name the object and the consequence (§17.10). */
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <Txt>{body}</Txt>
      <Button
        label={confirmLabel}
        variant={danger ? 'danger' : 'primary'}
        onPress={() => {
          onClose();
          onConfirm();
        }}
      />
      <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
    </Sheet>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  decLabel,
  incLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  decLabel: string;
  incLabel: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
      <Button
        label="−"
        variant="secondary"
        onPress={() => onChange(Math.max(min, value - 1))}
        style={{ width: MIN }}
      />
      <Txt bold size={20}>
        {value}
      </Txt>
      <Button
        label="+"
        variant="secondary"
        onPress={() => onChange(Math.min(max, value + 1))}
        style={{ width: MIN }}
      />
      <View accessibilityLabel={`${decLabel} / ${incLabel}`} />
    </View>
  );
}

export function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: IconName;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: spacing.md,
        gap: 6,
      }}
    >
      {icon ? <Icon name={icon} size={20} color={c.primary} /> : null}
      <Text style={{ fontSize: 28, fontWeight: '800', color: c.ink }}>{String(value)}</Text>
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{ fontSize: 13, color: c.muted }}
      >
        {label}
      </Text>
    </View>
  );
}

export function FunnelBar({ steps }: { steps: { label: string; value: number }[] }) {
  const c = useColors();
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <View style={{ gap: spacing.md }}>
      {steps.map((s, i) => (
        <View key={s.label} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: c.ink }}>{s.label}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>{s.value}</Text>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: c.border }}>
            <View
              style={{
                height: 10,
                borderRadius: 5,
                width: `${Math.max(s.value > 0 ? 3 : 0, (s.value / max) * 100)}%`,
                backgroundColor: i === steps.length - 1 ? c.success : c.primary,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export function useToggle(initial = false): [boolean, () => void, (v: boolean) => void] {
  const [v, setV] = useState(initial);
  return [v, () => setV((x) => !x), setV];
}

export const styles = StyleSheet.create({ flex: { flex: 1 } });

/** A quiet heading that groups what follows (replaces ad-hoc bold lines). */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 13,
          fontWeight: '800',
          letterSpacing: 0.6,
          color: c.muted,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
      {action}
    </View>
  );
}

/** A tappable tile with an icon: quick actions, channel choices. */
export function Tile({
  icon,
  label,
  hint,
  onPress,
  selected,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: '45%',
        minHeight: 88,
        gap: 6,
        padding: spacing.md,
        borderRadius: 16,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? c.primary : c.border,
        backgroundColor: selected ? c.primary + '12' : c.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={24} color={c.primary} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{label}</Text>
      {hint ? <Text style={{ fontSize: 13, color: c.muted }}>{hint}</Text> : null}
    </Pressable>
  );
}

/** A search box with its icon inside, like every phone app; the visible label is the placeholder. */
export function SearchBox({
  value,
  onChangeText,
  label,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  label: string;
  placeholder?: string;
}) {
  const c = useColors();
  return (
    <View
      style={{
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      }}
    >
      <Icon name="search" size={20} color={c.muted} />
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder ?? label}
        placeholderTextColor={c.muted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ flex: 1, fontSize: 16, color: c.ink, minHeight: 48 }}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="clear"
          onPress={() => onChangeText('')}
        >
          <Icon name="close" size={18} color={c.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}
