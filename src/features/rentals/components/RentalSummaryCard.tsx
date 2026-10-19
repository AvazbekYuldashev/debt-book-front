import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { formatMoney } from '../../../shared/lib/money';
import { normalizeCurrency } from '../../../shared/lib/currency';

interface RentalSummaryCardProps {
  loading?: boolean;
  /** Sanoq ustunining sarlavhasi — tanlangan filtr yoki "Omborda". */
  countLabel: string;
  countValue: string;
  /** Ikonka: ijara ro'yxatida quti, omborda javon. */
  countIcon?: keyof typeof Ionicons.glyphMap;
  moneyLabel: string;
  /** Valyuta → summa. Bo'sh bo'lsa `moneyEmpty` chiqadi. */
  moneyEntries: [string, number][];
  moneyEmpty: string;
}

/**
 * Ijara bo'limining yuqori paneli — ikki raqam: nechta va qancha pul.
 *
 * MAZMUNI CHAQIRUVCHIDAN keladi, chunki ekranning ikki bo'limi ikki xil
 * savolga javob beradi:
 *
 *   IJARALAR — tanlangan ro'yxatda nechta yozuv bor va ular qancha haq
 *              yig'gan;
 *   OMBOR    — nechta buyum bor va ular bir kunda qancha topadi.
 *
 * Ilgari karta faqat ijara panelini bilardi va Ombor ochiq turganda ham
 * o'sha ijara raqamlari qolib ketardi — ya'ni ekranning yarmida panel
 * ko'rilayotgan narsaga umuman aloqasi yo'q edi.
 *
 * Valyutalar ALOHIDA qator bo'lib turadi, chunki so'm bilan dollarni
 * qo'shib bo'lmaydi (gap kassadagi qoida bilan bir xil).
 */
const RentalSummaryCard: React.FC<RentalSummaryCardProps> = ({
  loading = false,
  countLabel,
  countValue,
  countIcon = 'cube-outline',
  moneyLabel,
  moneyEntries,
  moneyEmpty,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const dash = loading ? '—' : null;

  return (
    <View style={styles.card}>
      <View style={styles.counts}>
        <Count
          icon={countIcon}
          label={countLabel}
          value={dash ?? countValue}
          styles={styles}
          colors={colors}
        />
      </View>

      <View style={styles.moneyRow}>
        <MoneyBlock
          label={moneyLabel}
          entries={moneyEntries}
          empty={dash ?? moneyEmpty}
          tone={colors.textPrimary}
          styles={styles}
        />
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
