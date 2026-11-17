import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import type { Currency, CurrencyAmounts } from '../../../shared/lib/currency';

interface BalanceHeroProps {
  totalDebt: CurrencyAmounts;
  totalCredit: CurrencyAmounts;
  /** Asosiy valyuta — katta raqam shu valyutada chiqadi. */
  currency: Currency;
}

/**
 * Ekranning ENG TEPADAGI kartasi: bitta katta raqam — umumiy balans.
 *
 * Ilgari ekran darhol ikki katakli (qarz | haq) karta bilan boshlanardi
 * va odam "ahvolim qalay" degan savolga javob olish uchun ikkita raqamni
 * o'zi ayirishi kerak edi. Endi tepada YAKUNIY raqam turadi, qarz va haq
 * esa uning ostidagi kartada tafsilot bo'lib qoladi.
 *
 * Valyutalar QO'SHILMAYDI (kurs aralashmaydi): bu yerda faqat asosiy
 * valyuta ko'rinadi, qolganlari pastdagi kartada o'z qatorida turadi.
 *
 * Karta ostki qismi ataylab bo'sh: ostidagi tafsilot kartasi ustiga
 * MINIB turadi (salbiy chetki bo'shliq bilan) va ikkisi bitta blok
 * bo'lib ko'rinadi.
 */
const BalanceHero: React.FC<BalanceHeroProps> = ({ totalDebt, totalCredit, currency }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const net = (totalCredit[currency] ?? 0) - (totalDebt[currency] ?? 0);
  const positive = net >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        <Ionicons name="wallet-outline" size={18} color={colors.textOnPrimary} />
        <Text style={styles.label}>{t('debts.totalBalance')}</Text>
      </View>

      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {formatMoney(Math.abs(net), currency)}
      </Text>

      {/* Yo'nalish belgisi — raqamning o'zi ishorasiz chiqadi, shuning
          uchun "haq" yoki "qarz" ekanini so'z aytadi. */}
      <View style={styles.badge}>
        <Ionicons
          name={positive ? 'trending-up' : 'trending-down'}
          size={13}
          color={colors.textOnPrimary}
        />
        <Text style={styles.badgeText} numberOfLines={1}>
          {positive ? t('money.badgeCredit') : t('money.badgeDebt')}
        </Text>
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows }: ThemeValue) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.primary,
      borderRadius: radius.xxl,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      // Pastki bo'shliq KATTA: tafsilot kartasi shu joyga minadi.
      paddingBottom: spacing.xl + spacing.lg,
      marginHorizontal: spacing.md,
      ...shadows.card,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    label: {
      ...typography.body,
      fontSize: 15,
      color: colors.textOnPrimary,
      opacity: 0.9,
    },
    amount: {
      ...typography.heading1,
      fontSize: 32,
      fontWeight: '800',
      color: colors.textOnPrimary,
      marginTop: spacing.xs,
      fontVariant: ['tabular-nums'],
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginTop: spacing.sm,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.positiveSoft,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textOnPrimary,
    },
  });

export default memo(BalanceHero);
