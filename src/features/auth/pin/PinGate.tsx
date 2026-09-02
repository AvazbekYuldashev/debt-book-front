import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { AuthContext } from '../context/AuthContext';
import { useAppPin } from './PinContext';

const PIN_LENGTH = 4;
// Kirish oynasida shuncha marta xato kiritilsa — hisobdan chiqariladi
// (to'liq parol bilan qayta kirish talab qilinadi). Bank ilovalari kabi.
const MAX_ATTEMPTS = 5;

type Mode = 'create' | 'confirm' | 'enter';

/**
 * Ilova-qulfi ekrani.
 *
 * Ikki vazifa:
 *   - PIN yo'q bo'lsa (birinchi kirish): yaratish + tasdiqlash.
 *   - PIN bor bo'lsa: har ochilishda kiritish.
 *
 * Bu DBdagi hisob paroli emas — qurilmadagi mahalliy kod. Xato ko'p bo'lsa
 * hisobdan chiqariladi, chunki mahalliy kodni tiklashning boshqa yo'li yo'q:
 * odam to'liq parol bilan qayta kiradi va yangi PIN yaratadi.
 */
const PinGate: React.FC<{ mode: 'setup' | 'unlock' }> = ({ mode: gateMode }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { setupPin, unlock } = useAppPin();
  const { setProfile } = useContext(AuthContext);

  const [mode, setMode] = useState<Mode>(gateMode === 'setup' ? 'create' : 'enter');
  const [entry, setEntry] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);

  const title =
    mode === 'create'
      ? t('pin.createTitle')
      : mode === 'confirm'
        ? t('pin.confirmTitle')
        : t('pin.enterTitle');

  const submit = useCallback(
    async (code: string) => {
      if (mode === 'create') {
        // Birinchi kiritish — tasdiqqa o'tamiz.
        setFirstPin(code);
        setEntry('');
        setError(null);
        setMode('confirm');
        return;
      }
      if (mode === 'confirm') {
        if (code !== firstPin) {
          // Mos kelmadi — boshdan.
          setError(t('pin.mismatch'));
          setEntry('');
          setFirstPin('');
          setMode('create');
          return;
        }
        setBusy(true);
        await setupPin(code);
        return;
      }
      // enter
      setBusy(true);
      const ok = await unlock(code);
      setBusy(false);
      if (ok) return;
      const next = attempts + 1;
      setAttempts(next);
      setEntry('');
      if (next >= MAX_ATTEMPTS) {
        // Chiqarib yuboramiz: to'liq parol bilan qayta kirsin.
        setProfile(null);
        return;
      }
      setError(t('pin.wrong', { left: String(MAX_ATTEMPTS - next) }));
    },
    [mode, firstPin, attempts, setupPin, unlock, setProfile, t],
  );

  // To'liq uzunlikka yetganda avtomatik yuboriladi (tugma bosish shart emas).
  useEffect(() => {
    if (entry.length === PIN_LENGTH && !busy) {
      const code = entry;
      submit(code);
    }
  }, [entry, busy, submit]);

  const press = useCallback(
    (digit: string) => {
      setError(null);
      setEntry((prev) => (prev.length >= PIN_LENGTH ? prev : prev + digit));
    },
    [],
  );

  const backspace = useCallback(() => {
    setError(null);
    setEntry((prev) => prev.slice(0, -1));
  }, []);

  const renderKey = (label: string, onPress: () => void, testKey: string) => (
    <Pressable
      key={testKey}
      onPress={onPress}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={28} color={colors.primary} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.subtitle}>{t('pin.subtitle')}</Text>

        {/* Kiritilgan raqamlar — nuqtalar bilan. */}
        <View style={styles.dots}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < entry.length && styles.dotFilled, !!error && styles.dotError]}
            />
          ))}
        </View>

        <Text style={[styles.error, !error && styles.errorHidden]}>{error ?? ' '}</Text>

        {/* PIN'ni unutgan odam qamalib qolmasin: chiqib, to'liq parol bilan
            qayta kiradi va yangi PIN yaratadi. Faqat kirish oynasida. */}
        {mode === 'enter' ? (
          <Pressable
            onPress={() => setProfile(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('pin.forgot')}
          >
            <Text style={styles.forgot}>{t('pin.forgot')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.pad}>
        <View style={styles.padRow}>
          {['1', '2', '3'].map((d) => renderKey(d, () => press(d), d))}
        </View>
        <View style={styles.padRow}>
          {['4', '5', '6'].map((d) => renderKey(d, () => press(d), d))}
        </View>
        <View style={styles.padRow}>
          {['7', '8', '9'].map((d) => renderKey(d, () => press(d), d))}
        </View>
        <View style={styles.padRow}>
          <View style={styles.key} />
          {renderKey('0', () => press('0'), '0')}
          <Pressable
            onPress={backspace}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('pin.delete')}
          >
            <Ionicons name="backspace-outline" size={26} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xxl * 1.5,
      paddingBottom: spacing.xl,
    },
    top: {
      alignItems: 'center',
    },
    lockIcon: {
      width: 60,
      height: 60,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    dots: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xl,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: colors.border,
    },
    dotFilled: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dotError: {
      borderColor: colors.danger,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      textAlign: 'center',
      marginTop: spacing.md,
      minHeight: 18,
    },
    errorHidden: {
      opacity: 0,
    },
    forgot: {
      ...typography.label,
      color: colors.primary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    // Raqamli klaviatura — pastda, katta teginish maydonlari.
    pad: {
      gap: spacing.sm,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 320,
    },
    padRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    key: {
      flex: 1,
      aspectRatio: 1.6,
      maxHeight: 72,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    keyPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    keyText: {
      ...typography.heading1,
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  });

export default PinGate;
