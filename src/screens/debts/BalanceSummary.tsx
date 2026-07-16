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

/**
 * Umumiy qarz/haq xulosasi. Har valyuta hisobi ALOHIDA qatorda — so'm va dollar
 * bir-biriga aylantirilmaydi (foydalanuvchi talabi: mustaqil hisoblar).
 *
 * Har summa bosiladigan blok: qarz tomonidagi valyutani bossang ro'yxat o'sha
 * valyuta bo'yicha eng katta qarzdan eng katta haqgacha, haq tomonidagi valyutani
 * bossang teskarisiga saralanadi. Aktiv blokni qayta bosish yoki "Standart" tugmasi
 * odatiy (oxirgi amal birinchi) tartibga qaytaradi.
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
      <View style={[styles.icon, { backgroundColor: softColor }]}>
        <Ionicons name={iconName} size={15} color={color} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        {entries.length === 0 ? (
          <Text style={[styles.value, styles.valueIdle, { color }]}>
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
                  style={[styles.value, { color }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {entry.text}
                </Text>
                {active ? (
                  <Ionicons name="swap-vertical" size={11} color={color} />
                ) : null}
              </Pressable>
            );
          })
        )}
      </View>
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
      marginBottom: spacing.xxs,
    },
    amountBlock: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: '100%',
      paddingVertical: 3,
      paddingHorizontal: 7,
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
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '800',
      letterSpacing: -0.2,
      fontVariant: ['tabular-nums'],
      flexShrink: 1,
    },
    valueIdle: {
      marginTop: spacing.xxs,
      paddingHorizontal: 7,
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
