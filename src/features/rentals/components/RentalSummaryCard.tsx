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
 * Ijara bo'limining yuqori paneli — ijarachining uchta savoliga javob:
 *
 *   1. Nechta ijara ochiq, qanchasi kechikkan, nechtasi nasiyada?
 *   2. Mijozlardagi buyumlardan qancha pul OLINISHI KERAK?
 *   3. Buyumi qaytib, puli olinmagan — NASIYA qancha?
 *
 * Ikki pul raqami ATAYIN alohida: birinchisi hali o'sib boradi (buyum
 * mijozda), ikkinchisi qotib qolgan qarz — uni undirish kerak.
 *
 * Valyutalar ALOHIDA qator bo'lib turadi, chunki so'm bilan dollarni
 * qo'shib bo'lmaydi (gap kassadagi qoida bilan bir xil).
 *
 * Eski server ikki yangi maydonni yubormasa, avvalgidek bitta
 * "Olinmagan pul" ko'rsatiladi.
 */
const RentalSummaryCard: React.FC<RentalSummaryCardProps> = ({ summary, loading = false }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const split = Boolean(summary?.outUnpaidByCurrency || summary?.debtByCurrency);

  const outMoney = useMemo(
    () =>
      Object.entries(
        parseCurrencyAmounts(split ? summary?.outUnpaidByCurrency : summary?.unpaidByCurrency),
      ),
    [split, summary?.outUnpaidByCurrency, summary?.unpaidByCurrency],
  );
  const debtMoney = useMemo(
    () => Object.entries(parseCurrencyAmounts(summary?.debtByCurrency)),
    [summary?.debtByCurrency],
  );

  const active = summary?.activeCount ?? 0;
  const overdue = summary?.overdueCount ?? 0;
  const debt = summary?.debtCount ?? 0;

  const dash = loading ? '—' : null;

  return (
    <View style={styles.card}>
      <View style={styles.counts}>
        <Count
          icon="cube-outline"
          label={t('rentals.outCount')}
          value={dash ?? String(active)}
          styles={styles}
          colors={colors}
        />
        <View style={styles.divider} />
        <Count
          icon="alert-circle-outline"
          label={t('rentals.overdueCount')}
          value={dash ?? String(overdue)}
          tone={overdue > 0 ? colors.negative : undefined}
          styles={styles}
          colors={colors}
        />
        <View style={styles.divider} />
        <Count
          icon="wallet-outline"
          label={t('rentals.debtCount')}
          value={dash ?? String(debt)}
          tone={debt > 0 ? colors.secondary : undefined}
          styles={styles}
          colors={colors}
        />
      </View>

      <View style={styles.moneyRow}>
        <MoneyBlock
          label={split ? t('rentals.toCollect') : t('rentals.unpaidTotal')}
          entries={outMoney}
          empty={dash ?? t('rentals.allCollected')}
          tone={colors.negative}
          styles={styles}
        />
        {split ? (
          <MoneyBlock
            label={t('rentals.debtTotal')}
            entries={debtMoney}
            empty={dash ?? t('rentals.noDebt')}
            tone={colors.secondary}
            styles={styles}
            alignEnd
          />
        ) : null}
      </View>
    </View>
  );
};

interface CountProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: string;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeValue['colors'];
}

const Count: React.FC<CountProps> = ({ icon, label, value, tone, styles, colors }) => (
  <View style={styles.countBlock}>
    <View style={styles.countHead}>
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text style={styles.countLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
    <Text style={[styles.countValue, tone ? { color: tone } : null]}>{value}</Text>
  </View>
);

interface MoneyBlockProps {
  label: string;
  entries: [string, number | undefined][];
  /** Qator yo'q bo'lganda chiqadigan matn. */
  empty: string;
  tone: string;
  styles: ReturnType<typeof createStyles>;
  alignEnd?: boolean;
}

/**
 * Qator yo'q = pul qolmagan. "0 so'm" chizish noto'g'ri bo'lardi: qaysi
 * valyutada nol ekani ma'lum emas.
 */
const MoneyBlock: React.FC<MoneyBlockProps> = ({ label, entries, empty, tone, styles, alignEnd }) => (
  <View style={[styles.moneyBlock, alignEnd && styles.moneyBlockEnd]}>
    <Text style={styles.countLabel} numberOfLines={1}>
      {label}
    </Text>
    {entries.length === 0 ? (
      <Text style={styles.moneyMuted}>{empty}</Text>
    ) : (
      entries.map(([code, amount]) => (
        <Text key={code} style={[styles.moneyValue, { color: tone }]} numberOfLines={1}>
          {formatMoney(amount ?? 0, normalizeCurrency(code))}
        </Text>
      ))
    )}
  </View>
);

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    card: {
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
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    countBlock: {
      flex: 1,
      gap: 2,
      minWidth: 0,
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
      flexShrink: 1,
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
    moneyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.xs,
    },
    moneyBlock: {
      gap: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    moneyBlockEnd: {
      alignItems: 'flex-end',
    },
    moneyValue: {
      ...typography.body,
      fontSize: 15,
      fontWeight: '800',
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
