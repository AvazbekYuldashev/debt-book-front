import React, { useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../auth/context/AuthContext';
import { updateProfileAccent } from '../api/profile';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useAccent } from '../../../shared/theme/AccentProvider';
import { ACCENTS } from '../../../shared/theme/accent';
import { useI18n } from '../../../shared/i18n';

/**
 * Ilovaning asosiy rangini tanlash.
 *
 * BITTA rang butun ilovani bo'yaydi: brand rangi 67 ta joyda bitta
 * token orqali o'qiladi, shuning uchun har elementni alohida sozlash
 * shart emas va bo'lmaydi ham - ekranlar bir-biriga mos qolishi kerak.
 *
 * Doiralar MAVZUGA qarab chiziladi: qorong'ida ranglar ochroq. Odam
 * namunani ko'rib tanlaydi, keyin "nega boshqacha chiqdi" demaydi.
 */
const AccentPicker: React.FC = () => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const { profile, setProfile } = useContext(AuthContext);
  const { accent, setAccent } = useAccent();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [error, setError] = useState('');

  const isDark = theme.activeTheme === 'dark';
  const token = profile?.jwt;

  /**
   * Tanlov DARHOL qo'llanadi, server javobi kutilmaydi: rang ko'rinish
   * sozlamasi, uning kechikishi sezilib turardi. Server xatosi faqat
   * "boshqa qurilmada saqlanmadi" degani.
   */
  const choose = (id: string) => {
    setAccent(id);
    setError('');
    if (!token) return;
    void (async () => {
      try {
        await updateProfileAccent(id, token);
        setProfile((current) => (current ? { ...current, accent: id } : current));
      } catch {
        setError(t('accent.saveFailed'));
      }
    })();
  };

  return (
    <View>
      <Text style={styles.title}>{t('accent.title')}</Text>
      <Text style={styles.hint}>{t('accent.hint')}</Text>

      <View style={styles.row}>
        {ACCENTS.map((item) => {
          const shades = isDark ? item.dark : item.light;
          const active = item.id === accent;
          return (
            <Pressable
              key={item.id}
              onPress={() => choose(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(item.labelKey)}
              style={({ pressed }) => [styles.swatchWrap, pressed && styles.pressed]}
            >
              {/* Tanlanganini halqa ko'rsatadi, belgi emas: rangning
                  o'zi ko'rinib turishi kerak, ustidagi belgi esa uni
                  qisman yopib qo'yardi. */}
              <View
                style={[
                  styles.ring,
                  { borderColor: active ? shades.primary : 'transparent' },
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: shades.primary }]}>
                  {active ? (
                    <Ionicons name="checkmark" size={16} color={shades.onGradient} />
                  ) : null}
                </View>
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {t(item.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    title: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    swatchWrap: {
      alignItems: 'center',
      width: 64,
    },
    pressed: {
      opacity: 0.6,
    },
    // Halqa joyi DOIM band (nofaolda shaffof) — aks holda tanlov
    // almashganda qator ikki piksel sakrardi.
    ring: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatch: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
      textAlign: 'center',
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.xs,
    },
  });

export default AccentPicker;
