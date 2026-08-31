import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatGapAmount } from '../model/gapFormat';
import type { GapUnit } from '../types/gap';

interface GapGroupBalanceCardProps {
  unit: GapUnit;
  /** Shu guruhda jami olganim. */
  received: number;
  /** Shu guruhda jami berganim. */
  given: number;
  loading?: boolean;
}

/**
 * Guruh ekranining tepasidagi hisob kartasi — Qarzlar bo'limidagi umumiy
 * xulosa bilan bir xil ko'rinishda: chapda olganim (yashil), o'ngda berganim
 * (qizil), o'rtada ajratuvchi chiziq.
 *
 * Raqamlar faqat ikki tomon tasdiqlagan yozuvlardan (TZ 09) — tasdiq
 * kutayotgani hisobga kirmaydi, aks holda karta haqiqatdan chalg'itardi.
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
    value: number,
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
      <Text style={[styles.value, { color }]} numberOfLines={2}>
        {loading ? '—' : formatGapAmount(value, unit)}
      </Text>
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {renderTile(
          t('gap.totalReceived'),
          received,
          colors.positive,
          colors.positiveSoft,
          'arrow-down'
        )}
        <View style={styles.divider} />
        {renderTile(
          t('gap.totalGiven'),
          given,
          colors.negative,
          colors.negativeSoft,
          'arrow-up'
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
