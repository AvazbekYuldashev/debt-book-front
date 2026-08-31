import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import GapAmountStack from './GapAmountStack';
import { formatGapAmount } from '../model/gapFormat';
import type { GapAmountDTO, GapUnit } from '../types/gap';

interface GapGroupBalanceCardProps {
  /** Guruhning odatiy birligi — hech narsa bo'lmaganda nol shu birlikda. */
  unit: GapUnit;
  /** Shu guruhda jami olganim, birlik bo'yicha ajratilgan. */
  received: GapAmountDTO[];
  /** Shu guruhda jami berganim, birlik bo'yicha ajratilgan. */
  given: GapAmountDTO[];
  loading?: boolean;
}

/**
 * Guruh ekranining tepasidagi hisob kartasi — Qarzlar bo'limidagi umumiy
 * xulosa bilan bir xil ko'rinishda: chapda berganim (yashil — u menga
 * qaytishi kerak), o'ngda olganim (qizil — bu mening qarzim).
 *
 * Har birlik alohida qatorda: so'm, dollar va kg go'sht bir-biriga
 * qo'shilmaydi.
 *
 * Hisobga barcha yozuvlar kiradi; tasdiq faqat ikkinchi tomon roziligi
 * belgisi bo'lib, yozuv qatorida ko'rinadi.
 */
const GapGroupBalanceCard: React.FC<GapGroupBalanceCardProps> = ({
  unit,
  received,
  given,
  loading,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderTile = (
    label: string,
    items: GapAmountDTO[],
    color: string,
    softColor: string,
    iconName: keyof typeof Ionicons.glyphMap
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
      {loading ? (
        <Text style={[styles.value, { color }]}>—</Text>
      ) : (
        <GapAmountStack
          items={items}
          color={color}
          align="flex-start"
          style={styles.value}
          emptyText={formatGapAmount(0, unit)}
          emptyColor={color}
        />
      )}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {renderTile(
          t('gap.totalGiven'),
          given,
          colors.positive,
          colors.positiveSoft,
          'arrow-up'
        )}
        <View style={styles.divider} />
        {renderTile(
          t('gap.totalReceived'),
          received,
          colors.negative,
          colors.negativeSoft,
          'arrow-down'
        )}
      </View>
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
    value: {
      ...typography.caption,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '800',
      letterSpacing: -0.2,
      fontVariant: ['tabular-nums'],
    },
    divider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
  });

export default memo(GapGroupBalanceCard);
