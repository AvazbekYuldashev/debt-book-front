import React, { memo, useMemo } from 'react';
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
 * Ekranning yuqori paneli:
 *   yashil qator — men BERGANIM (bu oy / jami): menga qaytishi kerak
 *   qizil  qator — men OLGANIM  (bu oy / jami): mening qarzim
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
 */
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

  const entriesOf = (amounts?: GapAmountDTO[]) =>
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

  // Bitta birlik tanlangan bo'lsa nol ham o'sha birlikda ko'rsatiladi.
  const selectedUnit = units.find((unit) => unit.code === unitCode);
  const zeroText = selectedUnit ? formatGapAmount(0, selectedUnit) : '0';

  const renderTile = (
    direction: GapSortDirection,
    label: string,
    amounts: GapAmountDTO[] | undefined,
    color: string,
    softColor: string,
    iconName: keyof typeof Ionicons.glyphMap
  ) => {
    const entries = entriesOf(amounts);
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
        ) : entries.length === 0 ? (
          <Text style={[styles.value, { color }]} numberOfLines={1}>
            {zeroText}
          </Text>
        ) : (
          entries.map((entry) => {
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
          t('gap.currentMonthGiven'),
          summary?.currentMonthGiven,
          colors.positive,
          colors.positiveSoft,
          'arrow-up'
        )}
        <View style={styles.divider} />
        {renderTile(
          'given',
          t('gap.totalGiven'),
          summary?.totalGiven,
          colors.positive,
          colors.positiveSoft,
          'wallet-outline'
        )}
      </View>

      <View style={styles.rowDivider} />

      <View style={styles.row}>
        {renderTile(
          'received',
          t('gap.currentMonthReceived'),
          summary?.currentMonthReceived,
          colors.negative,
          colors.negativeSoft,
          'arrow-down'
        )}
        <View style={styles.divider} />
        {renderTile(
          'received',
          t('gap.totalReceived'),
          summary?.totalReceived,
          colors.negative,
          colors.negativeSoft,
          'time-outline'
        )}
      </View>

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
      paddingVertical: spacing.sm,
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
      paddingVertical: spacing.xs,
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
      width: 26,
      height: 26,
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
      lineHeight: 20,
      fontWeight: '800',
      letterSpacing: -0.2,
      fontVariant: ['tabular-nums'],
    },
    amountBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      paddingVertical: 2,
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
    filterScroll: {
      marginTop: spacing.sm,
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
      paddingVertical: spacing.xs,
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
