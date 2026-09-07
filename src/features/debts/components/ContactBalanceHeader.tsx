import React, { memo, useCallback, useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney, formatSignedMoney } from '../../../shared/lib/money';
import { buildTelUrl, formatPhoneDisplay } from '../../../shared/lib/phone';
import type { CurrencyNet } from '../../../shared/lib/currency';
import type { Contact } from '../context/ContactsContext';
import BackButton from '../../../shared/ui/BackButton';
import UserAvatar from '../../../shared/ui/UserAvatar';

const AVATAR_SIZE = 44;

interface ContactBalanceHeaderProps {
  contact: Contact;
  /** Har valyuta bo'yicha mustaqil sof balanslar (musbat = haq, manfiy = qarz). */
  balances: CurrencyNet[];
  onBack: () => void;
}

/**
 * Kontakt detali ekranining tepasi: orqaga tugma va bitta premium kartochka —
 * avatar, ism/telefon, ostida joriy balanslar HAR VALYUTA ALOHIDA qatorda
 * (so'm/dollar aralashtirilmaydi).
 *
 * Balans kartaning PASTKI qismida, to'liq enda: ilgari u ism bilan yonma-yon
 * turardi va uzun summa ("1 250 000 so'm") ismni siqib, ikkalasi ham
 * o'qilmaydigan darajada kichrayardi.
 *
 * Telefon raqam bosilganda telefonning o'z raqam terish oynasi ochiladi
 * (ilova ichidan qo'ng'iroq qilinmaydi).
 */
const ContactBalanceHeader: React.FC<ContactBalanceHeaderProps> = ({ contact, balances, onBack }) => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const telUrl = buildTelUrl(contact.phone);
  const isBusiness = contact.partyType === 'BUSINESS_ACCOUNT';

  const handleDial = useCallback(() => {
    if (!telUrl) return;
    Linking.openURL(telUrl).catch(() => {
      // Dialer ochilmasa (masalan, web'da qurilma qo'llamasa) — jim o'tamiz.
    });
  }, [telUrl]);

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <BackButton onPress={onBack} />
      </View>

      <View style={styles.card}>
        <View style={styles.identityRow}>
          <UserAvatar uri={undefined} size={AVATAR_SIZE} name={contact.fullName} />

          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {contact.fullName}
              </Text>
              {isBusiness ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t('debts.businessLabel')}</Text>
                </View>
              ) : null}
            </View>

            {contact.phone ? (
              <Pressable
                onPress={handleDial}
                disabled={!telUrl}
                style={({ pressed }) => [styles.phoneRow, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t('contact.callNumber')}
                hitSlop={6}
              >
                <Ionicons name="call-outline" size={iconSize.xs} color={colors.primary} />
                <Text style={styles.phone} numberOfLines={1}>
                  {formatPhoneDisplay(contact.phone)}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.balances}>
          {balances.length === 0 ? (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>{t('contact.currentBalance')}</Text>
              <Text style={[styles.balanceValue, { color: colors.textSecondary }]} numberOfLines={1}>
                {formatMoney(0)}
              </Text>
            </View>
          ) : (
            balances.map(({ currency, amount }) => {
              const positive = amount >= 0;
              const color = positive ? colors.positive : colors.negative;
              return (
                <View key={currency} style={styles.balanceRow}>
                  <View style={styles.balanceLabelRow}>
                    {/* Ma'no faqat rangda emas: yo'nalish ikonkasi va +/- belgisi ham bor. */}
                    <View style={[styles.balanceIcon, { backgroundColor: positive ? colors.positiveSoft : colors.negativeSoft }]}>
                      <Ionicons
                        name={positive ? 'arrow-up' : 'arrow-down'}
                        size={iconSize.xs - 2}
                        color={color}
                      />
                    </View>
                    <Text style={styles.balanceLabel}>
                      {positive ? t('debts.currentCredit') : t('debts.currentDebt')}
                    </Text>
                  </View>
                  <Text
                    style={[styles.balanceValue, { color }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {formatSignedMoney(amount, currency)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xxs,
    },
    topBar: {
      marginBottom: spacing.xs,
    },
    pressed: {
      opacity: 0.6,
    },
    card: {
      ...glass.pane,
      borderRadius: radius.xxl,
      padding: spacing.sm + 2,
      marginBottom: spacing.sm,
      ...shadows.raised,
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    identity: {
      flex: 1,
      minWidth: 0,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minWidth: 0,
    },
    name: {
      ...typography.body,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    badge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radius.xs,
      backgroundColor: colors.infoSoft,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      color: colors.info,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xxs + 1,
      marginTop: spacing.xxs,
    },
    phone: {
      ...typography.bodySmall,
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    balances: {
      gap: spacing.xxs + 2,
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    balanceLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexShrink: 1,
    },
    balanceIcon: {
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    balanceLabel: {
      ...typography.bodySmall,
      fontSize: 14,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    balanceValue: {
      ...typography.amount,
      fontSize: 20,
      lineHeight: 26,
      flexShrink: 1,
    },
  });

export default memo(ContactBalanceHeader);
