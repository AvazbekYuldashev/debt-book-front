import React, { memo, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatGapAmount } from '../model/gapFormat';
import {
  createBalanceTileStyles,
  tileContentWidth,
  valueFontSize,
} from '../../../shared/ui/balanceTile';
import {
  GapAmountDTO,
  GapSort,
  GapSortDirection,
  GapSummaryDTO,
  GapUnit,
  GapUnitFilter,
  netByUnit,
  splitNet,
  toAmount,
} from '../types/gap';

interface GapSummaryCardProps {
  summary?: GapSummaryDTO;
  units: GapUnit[];
  unitCode: GapUnitFilter;
  onUnitChange: (unitCode: GapUnitFilter) => void;
  /** Faol saralash — bosilgan raqam ajratib ko'rsatiladi. */
  sort: GapSort | null;
  /** Raqamga bosilganda: shu birlik bo'yicha eng kattadan saralash. */
  onAmountPress: (direction: GapSortDirection, unitCode: string) => void;
  loading?: boolean;
  /** Ochiq/yopiq holat GapListScreen'da — bitta tugma kartani ham,
   *  guruh qatorlarini ham boshqaradi. */
  expanded: boolean;
  onToggleExpand: () => void;
}

/**
 * Ekranning yuqori paneli: barcha guruhlar bo'yicha SOF qoldiq.
 *   yashil — HOZIRGI HAQ:  menga qaytishi kerak
 *   qizil  — HOZIRGI QARZ: men qaytarishim kerak
 *
 * Raqamlar haqiqatda bo'lib o'tgan, ikki tomon tasdiqlagan oldi-berdilardan:
 * rejalashtirilgan majburiyat degan narsa bu modelda yo'q.
 *
 * Har miqdor BIRLIK BO'YICHA ALOHIDA qator. Birlik pul bo'lishi shart emas:
 * so'm, dollar bilan bir qatorda "kg go'sht", "litr yog'" ham bo'ladi.
 * Ular hech qachon bir-biriga qo'shilmaydi va aylantirilmaydi — shuning
 * uchun "Hammasi" holatida bitta katakda bir nechta qator turishi mumkin.
 *
 * Filter chiplari qat'iy ro'yxat emas: foydalanuvchi qatnashayotgan
 * guruhlarda qanday birlik bo'lsa, o'sha chiqadi.
 *
 * Birlik ko'p bo'lsa karta ekranni egallab, guruhlar ro'yxatini pastga
 * surib yuborardi. Shuning uchun yig'iq holatda har katakda ko'pi bilan
 * ikki qator turadi, qolganini "Yana N ta" ochadi.
 *
 * Yalpi oqim EMAS, sof qoldiq: 1000 berib 1000 qaytarib olingan bo'lsa
 * ikkala katak ham nol bo'lishi kerak.
 */

/** Yig'iq holatda bitta katakda ko'rinadigan eng ko'p qator soni. */
const COLLAPSED_LIMIT = 2;

interface AmountEntry {
  unitCode: string;
  text: string;
}
const GapSummaryCard: React.FC<GapSummaryCardProps> = ({
  summary,
  units,
  unitCode,
  onUnitChange,
  sort,
  onAmountPress,
  loading,
  expanded,
  onToggleExpand,
}) => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // Katak o'lchamlari Qarzlar ekranidagi karta bilan BITTA manbadan.
  const tile = useMemo(() => createBalanceTileStyles(theme), [theme]);

  const entriesOf = (amounts?: GapAmountDTO[]): AmountEntry[] =>
    (amounts ?? [])
      .filter((entry) => toAmount(entry.amount) !== 0)
      .map((entry) => ({
        unitCode: entry.unitCode,
        text: formatGapAmount(toAmount(entry.amount), {
          code: entry.unitCode,
          label: entry.unitLabel,
          type: entry.unitType,
        }),
      }));

  // Barcha guruhlar bo'yicha sof qoldiq -> haq va qarz.
  const { haq, qarz } = splitNet(netByUnit(summary?.totalGiven, summary?.totalReceived));
  const haqRows = entriesOf(haq);
  const qarzRows = entriesOf(qarz);

  // Shrift mavjud enga qarab hisoblanadi — ikkala katak yonma-yon, shuning
  // uchun qator enini o'lchab, bitta katak enini chiqaramiz.
  const [rowWidth, setRowWidth] = useState(0);
  const handleRowLayout = useCallback(
    (event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width),
    [],
  );

  // Kartadagi ENG UZUN satr (ikkala tomondan) yagona shriftni belgilaydi.
  // Gap'da satrlar uzunroq ("232 dona gosht"), shuning uchun bu hisob bu
  // yerda ayniqsa kerak — qotirilgan o'lcham yo kesilar, yo mayda qolardi.
  const valueFont = useMemo(() => {
    const longest = [...haqRows, ...qarzRows].reduce(
      (max, entry) => Math.max(max, entry.text.length),
      0,
    );
    return valueFontSize(longest, tileContentWidth(rowWidth));
  }, [haqRows, qarzRows, rowWidth]);

  // Eng "to'la" katak nechta qatorni yashirayotgani.
  const maxRows = Math.max(haqRows.length, qarzRows.length);
  const hiddenCount = Math.max(0, maxRows - COLLAPSED_LIMIT);

  // Bitta birlik tanlangan bo'lsa nol ham o'sha birlikda ko'rsatiladi.
  const selectedUnit = units.find((unit) => unit.code === unitCode);
  const zeroText = selectedUnit ? formatGapAmount(0, selectedUnit) : '0';

  // Faqat "Hammasi" bo'lsa filtrda tanlov yo'q — yolg'iz chip qotib qolgan
  // progress chizig'iga o'xshardi. Lekin birlik filtri allaqachon tanlangan
  // bo'lsa (raqam bosilgan, birliklar ro'yxati kelmagan) "Hammasi"ga qaytish
  // yo'li qolishi shart.
  const showUnitRail = units.length > 0 || unitCode !== 'ALL';

  const renderTile = (
    direction: GapSortDirection,
    label: string,
    entries: AmountEntry[],
    color: string,
    softColor: string,
    iconName: keyof typeof Ionicons.glyphMap
  ) => {
    // Yig'iq holatda faol saralash qaysi birlikda bo'lsa, o'sha qator albatta
    // ko'rinib tursin - aks holda ro'yxat ko'rinmaydigan raqam bo'yicha
    // saralangandek tuyuladi.
    const activeEntry =
      sort?.direction === direction
        ? entries.find((entry) => entry.unitCode === sort.unitCode)
        : undefined;
    let shown = expanded ? entries : entries.slice(0, COLLAPSED_LIMIT);
    if (activeEntry && !shown.includes(activeEntry)) {
      shown = [...shown.slice(0, COLLAPSED_LIMIT - 1), activeEntry];
    }
    return (
      <View style={tile.tile}>
        <View style={tile.tileHeader}>
          <View style={[tile.icon, { backgroundColor: softColor }]}>
            <Ionicons name={iconName} size={iconSize.sm} color={color} />
          </View>
          <Text style={tile.label} numberOfLines={2}>
            {label}
          </Text>
        </View>
        {/* Yuklanish va nol NEYTRAL kulrangda (BalanceSummary, ContactRow
            bilan bir xil): qizil "0" ochiq qarzdek o'qiladi. Kategoriyani
            rangli ikonka bildiradi. */}
        {loading ? (
          <Text style={[tile.value, tile.valueIdle]}>—</Text>
        ) : shown.length === 0 ? (
          <Text style={[tile.value, tile.valueIdle, { fontSize: valueFont }]} numberOfLines={1}>
            {zeroText}
          </Text>
        ) : (
          shown.map((entry) => {
            const active = sort?.direction === direction && sort?.unitCode === entry.unitCode;
            return (
              <Pressable
                key={entry.unitCode}
                onPress={() => onAmountPress(direction, entry.unitCode)}
                style={({ pressed }) => [
                  tile.amountBlock,
                  active && { backgroundColor: softColor },
                  pressed && tile.amountBlockPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={label + ': ' + entry.text}
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
  };

  const renderChip = (code: GapUnitFilter, label: string) => {
    const active = code === unitCode;
    return (
      <Pressable
        key={code}
        onPress={() => onUnitChange(code)}
        style={({ pressed }) => [
          styles.chip,
          active && styles.chipActive,
          pressed && styles.chipPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.card}>
      {/* QARZ CHAPDA, HAQ O'NGDA — Qarzlar ekranidagi bilan bir xil tartib.
          Ilgari bu yerda teskari edi va bo'limni almashtirgan odam
          ranglarning joyi almashganini sezmay, raqamni teskari o'qirdi. */}
      <View style={tile.tilesRow} onLayout={handleRowLayout}>
        {renderTile(
          'received',
          t('gap.totalDebt'),
          qarzRows,
          colors.negative,
          colors.negativeSoft,
          'arrow-down'
        )}
        <View style={tile.divider} />
        {renderTile(
          'given',
          t('gap.totalCredit'),
          haqRows,
          colors.positive,
          colors.positiveSoft,
          'arrow-up'
        )}
      </View>

      {hiddenCount > 0 ? (
        <Pressable
          onPress={onToggleExpand}
          style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <Text style={styles.toggleText}>
            {expanded ? t('gap.showLess') : t('gap.showMore', { count: hiddenCount })}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={colors.primary}
          />
        </Pressable>
      ) : null}

      {/* Birlik soni oldindan noma'lum — chiplar gorizontal siljiydi. */}
      {showUnitRail ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
          style={styles.filterScroll}
        >
          {renderChip('ALL', t('gap.filterAll'))}
          {units.map((unit) => renderChip(unit.code, unit.label))}
        </ScrollView>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    // Ichki chekka har tomonda ~16px: yuqorida sm + qator tepasi (xxs),
    // pastda md. Pastki element (rail, "Yana N ta" yoki kataklar) shu
    // padding'ga to'g'ridan-to'g'ri tayanadi — avval rail chegaraga 8px
    // qolib, karta siqilgandek ko'rinardi.
    card: {
      // `raised` — Qarzlar ekranidagi tafsilot kartasi bilan BIR XIL sirt:
      // ikkisi ham balans kartasiga minib turadi va ular bir xil ko'rinishi
      // talab. `pane` suyuqroq edi, shuning uchun ostidagi rangli karta
      // undan ko'proq sizib chiqardi.
      //
      // Soyani ham shu token beradi: Android'da shaffof sirtga elevation
      // berilsa, soya yumaloq kontur o'rniga TO'RTBURCHAK chegara bo'yicha
      // chiziladi va karta ichida oq to'rtburchak paydo bo'ladi.
      ...glass.raised,
      borderRadius: radius.xxl,
      // Ichki bo'shliq ham Qarzlardagi karta bilan bir xil.
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      marginHorizontal: spacing.md,
      marginBottom: spacing.xs,
    },
    // Kataklardan 8px (avvalgi qator pastki xxs + xxs bilan bir xil).
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xxs,
      paddingTop: spacing.xxs,
    },
    togglePressed: {
      opacity: 0.6,
    },
    toggleText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    // Kataklardan 12px (avvalgi qator pastki xxs + xs bilan bir xil).
    filterScroll: {
      marginTop: spacing.xs,
      flexGrow: 0,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    filterBar: {
      flexDirection: 'row',
      gap: spacing.xxs,
      padding: 2,
    },
    chip: {
      alignItems: 'center',
      paddingVertical: spacing.xxs + 2,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
    },
    chipActive: {
      backgroundColor: colors.primary,
    },
    chipPressed: {
      opacity: 0.6,
    },
    chipText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.textOnPrimary,
    },
  });

export default memo(GapSummaryCard);
