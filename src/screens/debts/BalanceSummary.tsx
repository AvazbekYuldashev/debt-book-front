import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import { formatMoney } from '../../utils/money';
import { CURRENCIES, Currency, CurrencyAmounts, DEFAULT_CURRENCY } from '../../utils/currency';

// Saralash yo'nalishi: qarz tomoni (eng katta qarz birinchi) yoki haq tomoni.
export type SortDirection = 'debt' | 'credit';
export interface ActiveSort {
  direction: SortDirection;
  currency: Currency;
}

interface BalanceSummaryProps {
  totalDebt: CurrencyAmounts;
  totalCredit: CurrencyAmounts;
  activeSort: ActiveSort | null;
  onSelect: (direction: SortDirection, currency: Currency) => void;
  onReset: () => void;
}

interface CurrencyEntry {
  currency: Currency;
  text: string;
}

// Nolga teng bo'lmagan valyutalarni barqaror tartibda formatlab qaytaradi.
const currencyEntries = (amounts: CurrencyAmounts): CurrencyEntry[] => {
  const list: CurrencyEntry[] = [];
  for (const cur of CURRENCIES) {
    const value = amounts[cur];
    if (value) list.push({ currency: cur, text: formatMoney(value, cur) });
  }
  return list;
};

// Summa uzun bo'lganda shriftni kichraytiramiz. `adjustsFontSizeToFit` web'da
// (react-native-web) ishlamaydi — shuning uchun matn uzunligiga qarab qo'lda
// moslаymiz. Katta summalar ("5 004 179 446 so'm") ham to'liq ko'rinadi.
const valueFontSize = (length: number): number => {
  if (length <= 13) return 15;
  if (length <= 16) return 13;
  if (length <= 20) return 11;
  return 10;
};

/**
 * Umumiy qarz/haq xulosasi. Har valyuta hisobi ALOHIDA — so'm va dollar
 * bir-biriga aylantirilmaydi (foydalanuvchi talabi: mustaqil hisoblar).
 *
 * Joylashuv: yuqorida ikonka + sarlavha, ostida esa summalar butun katak enini
 * egallaydi (katta raqamlar siqilib ketmasligi uchun). Har summa bosiladigan blok:
 * qarz tomonini bossang eng katta qarzdan haqgacha, haq tomonini bossang teskarisiga
 * saralanadi. "Standart" tugmasi yoki aktiv blokni qayta bosish odatiy tartibga qaytaradi.
 */
const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  totalDebt,
  totalCredit,
  activeSort,
  onSelect,
  onReset,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const debtEntries = useMemo(() => currencyEntries(totalDebt), [totalDebt]);
  const creditEntries = useMemo(() => currencyEntries(totalCredit), [totalCredit]);

  const renderTile = (
    direction: SortDirection,
    entries: CurrencyEntry[],
    color: string,
    softColor: string,
    iconName: keyof typeof Ionicons.glyphMap,
    label: string,
  ) => (
    <View style={styles.tile}>
      <View style={styles.tileHeader}>
        <View style={[styles.icon, { backgroundColor: softColor }]}>
          <Ionicons name={iconName} size={15} color={color} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {entries.length === 0 ? (
        <Text
          style={[styles.value, styles.valueIdle, { color, fontSize: valueFontSize(6) }]}
          numberOfLines={1}
        >
          {formatMoney(0, DEFAULT_CURRENCY)}
        </Text>
      ) : (
        entries.map((entry) => {
          const active =
            activeSort?.direction === direction && activeSort?.currency === entry.currency;
          return (
            <Pressable
              key={entry.currency}
              onPress={() => onSelect(direction, entry.currency)}
              style={({ pressed }) => [
                styles.amountBlock,
                active && { backgroundColor: softColor, borderColor: color },
                pressed && styles.amountBlockPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}: ${entry.text}`}
            >
              <Text
                style={[styles.value, { color, fontSize: valueFontSize(entry.text.length) }]}
                numberOfLines={1}
              >
                {entry.text}
              </Text>
              {active ? (
                <Ionicons name="swap-vertical" size={12} color={color} />
              ) : null}
            </Pressable>
          );
        })
      )}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.tilesRow}>
        {renderTile(
          'debt',
          debtEntries,
          colors.negative,
          colors.negativeSoft,
          'arrow-down',
          t('debts.currentDebt'),
        )}
        <View style={styles.divider} />
        {renderTile(
          'credit',
          creditEntries,
          colors.positive,
          colors.positiveSoft,
          'arrow-up',
          t('debts.currentCredit'),
        )}
      </View>

      {activeSort ? (
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [styles.resetChip, pressed && styles.resetChipPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('debts.sortReset')}
        >
          <Ionicons name="refresh" size={12} color={colors.textSecondary} />
          <Text style={styles.resetText}>{t('debts.sortReset')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    card: {
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
    tilesRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    tile: {
      flex: 1,
      minWidth: 0,
    },
    tileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xxs,
    },
    icon: {
      width: 28,
      height: 28,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    amountBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'stretch',
      paddingVertical: 3,
      paddingHorizontal: 6,
      marginTop: spacing.xxs,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    amountBlockPressed: {
      opacity: 0.55,
    },
    value: {
      ...typography.caption,
      lineHeight: 19,
      fontWeight: '800',
      letterSpacing: -0.2,
      fontVariant: ['tabular-nums'],
      flexShrink: 1,
    },
    valueIdle: {
      marginTop: spacing.xxs,
      paddingHorizontal: 6,
    },
    divider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
    resetChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 4,
      marginTop: spacing.sm,
      paddingVertical: spacing.xxs + 1,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    resetChipPressed: {
      opacity: 0.6,
    },
    resetText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
  });

export default memo(BalanceSummary);
