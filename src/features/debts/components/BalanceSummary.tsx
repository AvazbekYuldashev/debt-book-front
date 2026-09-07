import React, { memo, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import { CURRENCIES, Currency, CurrencyAmounts, DEFAULT_CURRENCY } from '../../../shared/lib/currency';

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

// Asosiy summa: keng ekranda 24px gacha, tor ekranda 13px gacha kichrayadi.
// Yuqori chegara ATAYIN pasaytirilgan — bir nechta valyuta ko'rsatilganda
// karta ekranning yarmini egallab, ro'yxatga joy qoldirmasdi.
const VALUE_FONT_MAX = 24;
const VALUE_FONT_MIN = 13;
// Qalin, tabular-nums summa satri uchun o'rtacha belgi eni ≈ shriftning shuncha ulushi.
const AVG_CHAR_RATIO = 0.58;
// Summa blokining ichki gorizontal bo'shlig'i (aktiv holatda ham o'zgarmaydi).
const BLOCK_RESERVED = 16;
// Ajratuvchi chiziq va uning yon bo'shliqlari (katak eni hisobi uchun).
const DIVIDER_SPACE = 33;

/**
 * Summa shriftini MAVJUD ENGA qarab hisoblaydi: keng ekranda to'liq o'lcham
 * (VALUE_FONT_MAX), tor ekranda kerak bo'lgandagina kichrayadi (VALUE_FONT_MIN
 * gacha). Faqat uzunlikka qarash keng ekranda ham mayda qilib yuborardi.
 * `adjustsFontSizeToFit` web'da (react-native-web) ishlamaydi — shuning uchun qo'lda.
 *
 * `longestLength` — kartadagi ENG UZUN summa satri: barcha valyutalar (ikkala
 * tomonda ham) BIR XIL shrift oladi, aks holda uzun satr yonidagilardan kichik
 * bo'lib, xunuk ko'rinardi.
 */
const valueFontSize = (longestLength: number, availWidth: number): number => {
  if (!longestLength || availWidth <= 0) return VALUE_FONT_MAX;
  const fitted = Math.floor(availWidth / (longestLength * AVG_CHAR_RATIO));
  return Math.max(VALUE_FONT_MIN, Math.min(VALUE_FONT_MAX, fitted));
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
    const tileWidth = rowWidth > 0 ? (rowWidth - DIVIDER_SPACE) / 2 : 0;
    return valueFontSize(longest, tileWidth - BLOCK_RESERVED);
  }, [debtEntries, creditEntries, rowWidth]);

  const renderTile = (
    direction: SortDirection,
    entries: CurrencyEntry[],
    color: string,
    softColor: string,
    iconName: keyof typeof Ionicons.glyphMap,
    label: string,
    description: string,
  ) => (
    <View style={styles.tile}>
      <View style={styles.tileHeader}>
        <View style={[styles.icon, { backgroundColor: softColor }]}>
          <Ionicons name={iconName} size={iconSize.sm} color={color} />
        </View>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      </View>

      {loading && entries.length === 0 ? (
        // Balanslar hali yuklanmagan — "0" ko'rsatib chalg'itmaymiz.
        <Text style={[styles.value, styles.valueIdle, { color }]} numberOfLines={1}>
          …
        </Text>
      ) : entries.length === 0 ? (
        <Text
          style={[styles.value, styles.valueIdle, { color, fontSize: valueFont }]}
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
                active && { backgroundColor: softColor },
                pressed && styles.amountBlockPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}: ${entry.text}`}
            >
              <Text style={[styles.value, { color, fontSize: valueFont }]} numberOfLines={1}>
                {entry.text}
              </Text>
              {active ? (
                <Ionicons name="swap-vertical" size={iconSize.xs - 2} color={color} />
              ) : null}
            </Pressable>
          );
        })
      )}

      <Text style={styles.description} numberOfLines={2}>
        {description}
      </Text>
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.tilesRow} onLayout={handleRowLayout}>
        {renderTile(
          'debt',
          debtEntries,
          colors.negative,
          colors.negativeSoft,
          'arrow-down',
          t('debts.currentDebt'),
          t('debts.debtDescription'),
        )}
        <View style={styles.divider} />
        {renderTile(
          'credit',
          creditEntries,
          colors.positive,
          colors.positiveSoft,
          'arrow-up',
          t('debts.currentCredit'),
          t('debts.creditDescription'),
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
    card: {
      ...glass.raised,
      borderRadius: radius.xxl,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm + 2,
      marginHorizontal: spacing.md,
    },
    tilesRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
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
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...typography.bodySmall,
      fontSize: 13,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    amountBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      alignSelf: 'flex-start',
      maxWidth: '100%',
      paddingVertical: spacing.xxs / 2,
      paddingHorizontal: spacing.xxs,
      marginLeft: -spacing.xxs,
      borderRadius: radius.md,
    },
    amountBlockPressed: {
      opacity: 0.55,
    },
    value: {
      ...typography.amount,
      lineHeight: 30,
      flexShrink: 1,
    },
    valueIdle: {
      paddingVertical: spacing.xxs / 2,
    },
    description: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
      marginTop: spacing.xxs / 2,
    },
    // Ikki katak orasidagi vertikal ajratgich — juda nozik, "qattiq" border emas.
    divider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
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
