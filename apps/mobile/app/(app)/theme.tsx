import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useColors, useTheme } from '../../src/lib/theme';
import { useT } from '../../src/lib/i18n';
import { AppHeader } from '../../src/ui/header';
import { Banner, Button, Card, Field, Row, Screen, Txt } from '../../src/ui/kit';

export default function ThemeCustomizer() {
  const t = useT();
  const c = useColors();
  const { presets, activePresetId, setPreset, setCustomTheme, resetTheme } = useTheme();

  const [customPrimary, setCustomPrimary] = useState(c.primary);
  const [customBg, setCustomBg] = useState(c.bg);
  const [msg, setMsg] = useState<string | null>(null);

  const handleApplyPreset = async (id: string) => {
    await setPreset(id);
    const chosen = presets.find((p) => p.id === id);
    if (chosen) {
      setCustomPrimary(chosen.primary);
      setCustomBg(chosen.bg);
    }
    setMsg(t('theme.saved'));
  };

  const handleApplyCustom = async () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(customPrimary.trim())) {
      setMsg(t('theme.invalid'));
      return;
    }
    await setCustomTheme(customPrimary.trim(), customBg.trim());
    setMsg(t('theme.saved'));
  };

  const handleReset = async () => {
    await resetTheme();
    setCustomPrimary('#ED1C24');
    setCustomBg('#0A0A07');
    setMsg(t('theme.saved'));
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={t('theme.title')} onBack={() => router.back()} />
      <Screen>
        {msg ? <Banner tone="success" text={msg} /> : null}

        <Txt bold size={20}>
          {t('theme.preview')}
        </Txt>

        {/* Live Preview Card */}
        <Card>
          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Txt bold size={18}>
                Kadisasa
              </Txt>
              <View
                style={{
                  backgroundColor: c.primarySoft,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Txt size={12} bold color={c.primary}>
                  {t('states.synced')}
                </Txt>
              </View>
            </View>
            <Txt size={14} color={c.muted}>
              {t('ops.branding.intro')}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Button label={t('theme.primary')} onPress={() => {}} />
              </View>
              <View style={{ flex: 1 }}>
                <Button variant="secondary" label={t('common.cancel')} onPress={() => {}} />
              </View>
            </View>
          </View>
        </Card>

        {/* Preset Palettes */}
        <Txt bold size={20} style={{ marginTop: 8 }}>
          {t('theme.presets')}
        </Txt>

        <View style={{ gap: 8 }}>
          {presets.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <Pressable
                key={preset.id}
                onPress={() => void handleApplyPreset(preset.id)}
                style={{
                  backgroundColor: c.surface,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? c.primary : c.border,
                }}
              >
                <Row label={preset.name}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: preset.primary,
                        borderWidth: 1,
                        borderColor: '#FFF',
                      }}
                    />
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: preset.bg,
                        borderWidth: 1,
                        borderColor: '#666',
                      }}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Txt bold size={16} color={isSelected ? c.primary : c.ink}>
                      {preset.name}
                    </Txt>
                    <Txt size={12} color={c.muted}>
                      {preset.primary} · {preset.bg}
                    </Txt>
                  </View>
                  {isSelected ? (
                    <Txt size={14} bold color={c.primary}>
                      ✓
                    </Txt>
                  ) : null}
                </Row>
              </Pressable>
            );
          })}
        </View>

        {/* Custom Colors Option */}
        <Txt bold size={20} style={{ marginTop: 8 }}>
          {t('theme.custom')}
        </Txt>

        <Field
          label={t('theme.primary')}
          hint="#ED1C24"
          value={customPrimary}
          onChangeText={setCustomPrimary}
          maxLength={7}
          autoCapitalize="characters"
        />

        <Field
          label={t('theme.bg')}
          hint="#0A0A07"
          value={customBg}
          onChangeText={setCustomBg}
          maxLength={7}
          autoCapitalize="characters"
        />

        <View style={{ gap: 10, marginTop: 4 }}>
          <Button label={t('theme.apply')} onPress={() => void handleApplyCustom()} />
          <Button variant="ghost" label={t('theme.reset')} onPress={() => void handleReset()} />
        </View>
      </Screen>
    </View>
  );
}
