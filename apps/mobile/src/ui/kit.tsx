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
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
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
      style={[
        {
          minHeight: MIN,
          borderRadius: radius.input,
          backgroundColor: bg,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: c.border,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          opacity: off ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 16, fontWeight: '600' }}>{label}</Text>
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

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: radius.card,
          borderWidth: 1,
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
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderColor: c.border,
      }}
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

export function Avatar({ text }: { text: string }) {
  const c = useColors();
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: c.onPrimary, fontWeight: '700' }}>{text}</Text>
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
/** Colour is never the only signal: the pill always has a word (§17.12). */
export function Pill({ label, tone = 'neutral' }: { label: string; tone?: keyof typeof TONES }) {
  const c = useColors();
  const color = c[TONES[tone]];
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: color,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color, fontSize: 14, fontWeight: '600' }}>{label}</Text>
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
  return (
    <View
      accessibilityRole="alert"
      style={{
        borderLeftWidth: 4,
        borderColor: c[tone],
        backgroundColor: c.surface,
        padding: spacing.md,
        borderRadius: radius.input,
      }}
    >
      <Txt size={14}>{text}</Txt>
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
}: {
  text: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, padding: spacing.xl }}>
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

export function Kpi({ label, value }: { label: string; value: string | number }) {
  const c = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: c.border,
        padding: spacing.md,
        gap: 2,
      }}
    >
      <Txt size={14} color={c.muted}>
        {label}
      </Txt>
      <Txt size={28} bold>
        {String(value)}
      </Txt>
    </View>
  );
}

export function FunnelBar({ steps }: { steps: { label: string; value: number }[] }) {
  const c = useColors();
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <View style={{ gap: spacing.sm }}>
      {steps.map((s) => (
        <View key={s.label} style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt size={14}>{s.label}</Txt>
            <Txt size={14} bold>
              {s.value}
            </Txt>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.border }}>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                width: `${(s.value / max) * 100}%`,
                backgroundColor: c.primary,
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
