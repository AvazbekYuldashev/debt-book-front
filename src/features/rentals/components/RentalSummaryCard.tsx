import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import { normalizeCurrency, parseCurrencyAmounts } from '../../../shared/lib/currency';
import type { RentalSummaryDTO } from '../types/rental';

interface RentalSummaryCardProps {
  summary?: RentalSummaryDTO | null;
  loading?: boolean;
}

/**
 * Ijara bo'limining yuqori paneli.
 *
 * Chapda ikki raqam: nechta buyum odamlarda va qanchasining muddati
 * o'tgan. O'ngda pul — valyutalar ALOHIDA qator bo'lib turadi, chunki
 * so'm bilan dollarni qo'shib bo'lmaydi (gap kassadagi qoida bilan bir xil).
 *
 * "Olinmagan" raqami ataylab pastda va rangli: foydalanuvchiga eng kerakli
 * ma'lumot — qancha pul hali qo'lga tegmagani.
 */
const RentalSummaryCard: React.FC<RentalSummaryCardProps> = ({ summary, loading = false }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const unpaid = useMemo(
    () => Object.entries(parseCurrencyAmounts(summary?.unpaidByCurrency)),
    [summary?.unpaidByCurrency],
  );

  const active = summary?.activeCount ?? 0;
  const overdue = summary?.overdueCount ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.counts}>
        <View style={styles.countBlock}>
          <View style={styles.countHead}>
            <Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.countLabel}>{t('rentals.outCount')}</Text>
          </View>
          <Text style={styles.countValue}>{loading ? '—' : String(active)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.countBlock}>
          <View style={styles.countHead}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.countLabel}>{t('rentals.overdueCount')}</Text>
          </View>
          <Text style={[styles.countValue, overdue > 0 ? { color: colors.negative } : null]}>
            {loading ? '—' : String(overdue)}
          </Text>
        </View>
      </View>

      <View style={styles.moneyBlock}>
        <Text style={styles.countLabel}>{t('rentals.unpaidTotal')}</Text>
        {/* Qator yo'q = olinmagan pul qolmagan. "0 so'm" chizish noto'g'ri
            bo'lardi: qaysi valyutada nol ekani ma'lum emas. */}
        {unpaid.length === 0 ? (
          <Text style={styles.moneyMuted}>{loading ? '—' : t('rentals.allCollected')}</Text>
        ) : (
          unpaid.map(([code, amount]) => (
            <Text key={code} style={styles.moneyValue} numberOfLines={1}>
              {formatMoney(amount ?? 0, normalizeCurrency(code))}
            </Text>
          ))
        )}
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'stretch',
      justifyContent: 'space-between',
      gap: spacing.sm,
      // Gap kassaning statistika paneli bilan bir xil sirt — ikki bo'lim
      // yonma-yon turganda ular bir xil ko'rinishi kerak.
      ...glass.pane,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    counts: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: spacing.sm,
      flexShrink: 1,
    },
    countBlock: {
      gap: 2,
    },
    countHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    countLabel: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    countValue: {
      ...typography.body,
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    moneyBlock: {
      alignItems: 'flex-end',
      gap: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    moneyValue: {
      ...typography.body,
      fontSize: 15,
      fontWeight: '800',
      color: colors.negative,
      fontVariant: ['tabular-nums'],
    },
    moneyMuted: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });

export default memo(RentalSummaryCard);
