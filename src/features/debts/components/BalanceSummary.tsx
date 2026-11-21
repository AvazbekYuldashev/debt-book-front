import React, { memo, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import { CURRENCIES, Currency, CurrencyAmounts, DEFAULT_CURRENCY } from '../../../shared/lib/currency';
import {
  createBalanceTileStyles,
  tileContentWidth,
  valueFontSize,
} from '../../../shared/ui/balanceTile';

// Saralash yo'nalishi: qarz tomoni (eng katta qarz birinchi) yoki haq tomoni.
export type SortDirection = 'debt' | 'credit';
export interface ActiveSort {
  direction: SortDirection;
  currency: Currency;
}

interface BalanceSummaryProps {
  totalDebt: CurrencyAmounts;
  totalCredit: CurrencyAmounts;
  /** Balanslar hali birinchi marta yuklanyapti — "0" o'rniga yuklanish belgisi. */
  loading?: boolean;
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
 * Umumiy qarz/haq xulosasi — ekranning asosiy kartasi.
 *
 * Har valyuta hisobi ALOHIDA: so'm va dollar bir-biriga aylantirilmaydi
 * (foydalanuvchi talabi — mustaqil hisoblar).
 *
 * Har katakda: pastel doiradagi yo'nalish ikonkasi + sarlavha, ostida katta
 * summa, eng ostida izoh. Summa ATAYIN katakning TO'LIQ enini oladi (ikonka
 * ostidan boshlanadi, uning yonidan emas): "1 250 000 so'm" kabi haqiqiy
 * qiymatlar ikonka eniga siqilsa, shrift o'qib bo'lmas darajada kichrayardi.
 *
 * Summani bosish saralaydi: qarz tomonini bossang eng katta qarzdan haqgacha,
 * haq tomonini bossang teskarisiga. "Standart tartib" yoki aktiv blokni qayta
 * bosish odatiy tartibga qaytaradi.
 */
const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  totalDebt,
  totalCredit,
  loading = false,
  activeSort,
  onSelect,
  onReset,
}) => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // Katak o'lchamlari Gap to'yona kartasi bilan BITTA manbadan.
  const tile = useMemo(() => createBalanceTileStyles(theme), [theme]);

  const debtEntries = useMemo(() => currencyEntries(totalDebt), [totalDebt]);
  const creditEntries = useMemo(() => currencyEntries(totalCredit), [totalCredit]);

  // Shrift mavjud enga qarab hisoblanadi — ikkala katak yonma-yon, shuning uchun
  // qator enini o'lchab, bitta katak enini chiqaramiz.
  const [rowWidth, setRowWidth] = useState(0);
  const handleRowLayout = useCallback(
    (event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width),
    [],
  );

  // Kartadagi ENG UZUN summa (ikkala tomondan) yagona shriftni belgilaydi.
  const valueFont = useMemo(() => {
    const longest = [...debtEntries, ...creditEntries].reduce(
      (max, entry) => Math.max(max, entry.text.length),
      0,
    );
    return valueFontSize(longest, tileContentWidth(rowWidth));
  }, [debtEntries, creditEntries, rowWidth]);

  const renderTile = (
    direction: SortDirection,
    entries: CurrencyEntry[],
    color: string,
    softColor: string,
    iconName: keyof typeof Ionicons.glyphMap,
    label: string,
  ) => (
    <View style={tile.tile}>
      <View style={tile.tileHeader}>
        <View style={[tile.icon, { backgroundColor: softColor }]}>
          <Ionicons name={iconName} size={iconSize.sm} color={color} />
        </View>
        <Text style={tile.label} numberOfLines={2}>
          {label}
        </Text>
      </View>

      {/* Yuklanish va nol qiymat NEYTRAL kulrangda — ContactRow va
          ContactBalanceHeader'dagi "yopiq hisob" qoidasi bilan bir xil: qizil
          "0" ochiq qarzdek o'qiladi. Kategoriyani rangli ikonka bildiradi. */}
      {loading && entries.length === 0 ? (
        // Balanslar hali yuklanmagan — "0" ko'rsatib chalg'itmaymiz.
        <Text style={[tile.value, tile.valueIdle]} numberOfLines={1}>
          …
        </Text>
      ) : entries.length === 0 ? (
        <Text
          style={[tile.value, tile.valueIdle, { fontSize: valueFont }]}
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
                tile.amountBlock,
                active && { backgroundColor: softColor },
                pressed && tile.amountBlockPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}: ${entry.text}`}
            >
              <Text style={[tile.value, { color, fontSize: valueFont }]} numberOfLines={1}>
                {entry.text}
              </Text>
              {active ? (
                <Ionicons name="swap-vertical" size={iconSize.xs - 2} color={color} />
              ) : null}
            </Pressable>
          );
        })
      )}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={tile.tilesRow} onLayout={handleRowLayout}>
        {renderTile(
          'debt',
          debtEntries,
          colors.negative,
          colors.negativeSoft,
          'arrow-down',
          t('debts.currentDebt'),
        )}
        <View style={tile.divider} />
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
          <Ionicons name="refresh" size={iconSize.xs - 2} color={colors.textSecondary} />
          <Text style={styles.resetText}>{t('debts.sortReset')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    /**
     * Ichki bo'shliq kengaytirilgan: raqamlar karta qirrasiga yopishib
     * turardi va blok siqilgandek ko'rinardi.
     */
    card: {
      ...glass.raised,
      borderRadius: radius.xxl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginHorizontal: spacing.md,
    },
    resetChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: spacing.xxs,
      minHeight: 36,
      marginTop: spacing.sm,
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      ...glass.muted,
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
