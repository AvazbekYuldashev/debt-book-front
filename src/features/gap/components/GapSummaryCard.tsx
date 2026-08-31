import React, { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatGapAmount } from '../model/gapFormat';
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
}

/**
 * Ekranning yuqori paneli: barcha guruhlar bo'yicha SOF qoldiq.
 *   yashil — JAMI HAQ:  menga qaytishi kerak
 *   qizil  — JAMI QARZ: men qaytarishim kerak
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
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);

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

  // Eng "to'la" katak nechta qatorni yashirayotgani.
  const maxRows = Math.max(haqRows.length, qarzRows.length);
  const hiddenCount = Math.max(0, maxRows - COLLAPSED_LIMIT);

  // Bitta birlik tanlangan bo'lsa nol ham o'sha birlikda ko'rsatiladi.
  const selectedUnit = units.find((unit) => unit.code === unitCode);
  const zeroText = selectedUnit ? formatGapAmount(0, selectedUnit) : '0';

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
      <View style={styles.tile}>
        <View style={styles.tileHeader}>
          <View style={[styles.icon, { backgroundColor: softColor }]}>
            <Ionicons name={iconName} size={14} color={color} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
        </View>
        {loading ? (
          <Text style={[styles.value, { color }]}>—</Text>
        ) : shown.length === 0 ? (
          <Text style={[styles.value, { color }]} numberOfLines={1}>
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
                  styles.amountBlock,
                  active && { backgroundColor: softColor, borderColor: color },
                  pressed && styles.amountBlockPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={label + ': ' + entry.text}
              >
                <Text style={[styles.value, { color }]} numberOfLines={1}>
                  {entry.text}
                </Text>
                {active ? <Ionicons name="swap-vertical" size={12} color={color} /> : null}
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
      <View style={styles.row}>
        {renderTile(
          'given',
          t('gap.totalCredit'),
          haqRows,
          colors.positive,
          colors.positiveSoft,
          'arrow-up'
        )}
        <View style={styles.divider} />
        {renderTile(
          'received',
          t('gap.totalDebt'),
          qarzRows,
          colors.negative,
          colors.negativeSoft,
          'arrow-down'
        )}
      </View>

      {hiddenCount > 0 ? (
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
        style={styles.filterScroll}
      >
        {renderChip('ALL', t('gap.filterAll'))}
        {units.map((unit) => renderChip(unit.code, unit.label))}
      </ScrollView>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing.xxs,
    },
    tile: {
      flex: 1,
      minWidth: 0,
    },
    tileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs + 2,
      marginBottom: 2,
    },
    icon: {
      width: 22,
      height: 22,
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
    value: {
      ...typography.caption,
      fontSize: 15,
      lineHeight: 19,
      fontWeight: '800',
      letterSpacing: -0.2,
      fontVariant: ['tabular-nums'],
    },
    amountBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      paddingVertical: 1,
      paddingHorizontal: 6,
      marginLeft: -6,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    amountBlockPressed: {
      opacity: 0.55,
    },
    divider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
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
    filterScroll: {
      marginTop: spacing.xs,
      flexGrow: 0,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    filterBar: {
      flexDirection: 'row',
      gap: spacing.xxs,
      padding: spacing.xxs,
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
