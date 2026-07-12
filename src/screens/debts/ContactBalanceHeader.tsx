import React, { memo, useCallback, useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import { formatMoney } from '../../utils/money';
import { buildTelUrl, formatPhoneDisplay } from '../../utils/phone';
import type { CurrencyNet } from '../../utils/currency';
import type { Contact } from '../../context/ContactsContext';

interface ContactBalanceHeaderProps {
  contact: Contact;
  /** Har valyuta bo'yicha mustaqil sof balanslar (musbat = haq, manfiy = qarz). */
  balances: CurrencyNet[];
  onBack: () => void;
}

/**
 * Kontakt detali ekranining tepasi: orqaga tugma va bitta ixcham kartochka —
 * chapda ism/telefon, o'ng tomonida joriy balanslar HAR VALYUTA ALOHIDA
 * qatorda (so'm/dollar aralashtirilmaydi). Rasm (avatar) yo'q.
 * Telefon raqam bosilganda telefonning o'z raqam terish oynasi ochiladi
 * (ilova ichidan qo'ng'iroq qilinmaydi).
 */
const ContactBalanceHeader: React.FC<ContactBalanceHeaderProps> = ({ contact, balances, onBack }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const telUrl = buildTelUrl(contact.phone);

  const handleDial = useCallback(() => {
    if (!telUrl) return;
    Linking.openURL(telUrl).catch(() => {
      // Dialer ochilmasa (masalan, web'da qurilma qo'llamasa) — jim o'tamiz.
    });
  }, [telUrl]);

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          hitSlop={6}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={2}>
              {contact.fullName}
            </Text>
            {contact.phone ? (
              <Pressable
                onPress={handleDial}
                disabled={!telUrl}
                style={({ pressed }) => [styles.phoneRow, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t('contact.callNumber')}
                hitSlop={6}
              >
                <Ionicons name="call-outline" size={13} color={colors.primary} />
                <Text style={styles.phone} numberOfLines={1}>
                  {formatPhoneDisplay(contact.phone)}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.balances}>
            {balances.length === 0 ? (
              <Text
                style={[styles.balanceValue, { color: colors.textSecondary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {formatMoney(0)}
              </Text>
            ) : (
              balances.map(({ currency, amount }) => (
                <Text
                  key={currency}
                  style={[
                    styles.balanceValue,
                    balances.length > 1 && styles.balanceValueCompact,
                    { color: amount >= 0 ? colors.positive : colors.negative },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {formatMoney(amount, currency)}
                </Text>
              ))
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    topBar: {
      marginBottom: spacing.xs,
    },
    backButton: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.6,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.md + 2,
      marginBottom: spacing.md,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 22,
      elevation: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    identity: {
      flex: 1,
    },
    name: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xxs + 1,
      marginTop: spacing.xxs,
    },
    phone: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    balances: {
      flexShrink: 1,
      maxWidth: '60%',
      alignItems: 'flex-end',
    },
    balanceValue: {
      ...typography.heading1,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    // Ikki va undan ko'p valyuta ko'rsatilganda qatorlar ixchamroq.
    balanceValueCompact: {
      fontSize: 20,
      lineHeight: 26,
    },
  });

export default memo(ContactBalanceHeader);
