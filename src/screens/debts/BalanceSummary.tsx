import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import { formatMoney } from '../../utils/money';
import { CURRENCIES, CurrencyAmounts, DEFAULT_CURRENCY } from '../../utils/currency';

interface BalanceSummaryProps {
  totalDebt: CurrencyAmounts;
  totalCredit: CurrencyAmounts;
}

// Har valyuta o'z qatorida ko'rsatiladi; bo'sh bo'lsa standart valyutada "0".
const amountLines = (amounts: CurrencyAmounts): string[] => {
  const lines: string[] = [];
  for (const cur of CURRENCIES) {
    const value = amounts[cur];
    if (value) lines.push(formatMoney(value, cur));
  }
  return lines.length > 0 ? lines : [formatMoney(0, DEFAULT_CURRENCY)];
};

/**
 * Umumiy qarz/haq xulosasi. Har valyuta hisobi ALOHIDA qatorda — so'm va dollar
 * bir-biriga aylantirilmaydi (foydalanuvchi talabi: ikki mustaqil hisob).
 */
const BalanceSummary: React.FC<BalanceSummaryProps> = ({ totalDebt, totalCredit }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const debtLines = useMemo(() => amountLines(totalDebt), [totalDebt]);
  const creditLines = useMemo(() => amountLines(totalCredit), [totalCredit]);

  return (
    <View style={styles.card}>
      <View style={styles.tile}>
        <View style={[styles.icon, { backgroundColor: colors.negativeSoft }]}>
          <Ionicons name="arrow-down" size={15} color={colors.negative} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.label}>{t('debts.currentDebt')}</Text>
          {debtLines.map((line) => (
            <Text
              key={line}
              style={[styles.value, { color: colors.negative }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {line}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.tile}>
        <View style={[styles.icon, { backgroundColor: colors.positiveSoft }]}>
          <Ionicons name="arrow-up" size={15} color={colors.positive} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.label}>{t('debts.currentCredit')}</Text>
          {creditLines.map((line) => (
            <Text
              key={line}
              style={[styles.value, { color: colors.positive }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {line}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.xs,
      marginHorizontal: spacing.md,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
    },
    tile: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
    },
    icon: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      flex: 1,
    },
    label: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    value: {
      ...typography.caption,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '800',
      letterSpacing: -0.2,
      fontVariant: ['tabular-nums'],
      flexShrink: 1,
    },
    divider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
  });

export default memo(BalanceSummary);
