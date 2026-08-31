import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { GapResponseDTO, toAmount, unitOf } from '../types/gap';
import { formatGapAmount, formatGapDate } from '../model/gapFormat';

interface GapRowProps {
  item: GapResponseDTO;
  onPress?: (item: GapResponseDTO) => void;
}

/**
 * Ro'yxatdagi bitta gap kassa.
 *
 * Chapda nomi, badali va navbat ma'lumoti; o'ngda esa davr belgisi va shu
 * guruh bo'yicha shaxsiy hisobim — olganim va berganim ustma-ust turadi.
 * Raqamlar bir ustunda tursa, guruhlarni ko'z bilan solishtirish oson.
 */
const GapRow: React.FC<GapRowProps> = ({ item, onPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isMyTurnNow = item.myQueuePosition != null && item.myQueuePosition === item.currentPeriod;

  const unit = unitOf(item);
  const received = toAmount(item.myTotalReceived);
  const given = toAmount(item.myTotalGiven);

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>

        <Text style={styles.amount}>
          {formatGapAmount(toAmount(item.amount), unit)}
          <Text style={styles.amountSuffix}> · {t('gap.perMonth')}</Text>
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Ionicons
              name="person-outline"
              size={13}
              color={isMyTurnNow ? colors.positive : colors.textSecondary}
            />
            <Text
              style={[styles.metaText, isMyTurnNow && { color: colors.positive, fontWeight: '700' }]}
            >
              {item.myQueuePosition != null
                ? t('gap.myTurnValue', {
                    position: String(item.myQueuePosition),
                    date: formatGapDate(item.myTurnDate),
                  })
                : '—'}
            </Text>
          </View>

          <View style={styles.meta}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{formatGapDate(item.nextPaymentDate)}</Text>
          </View>
        </View>
      </View>

      {/* O'ng ustun: davr belgisi va shaxsiy hisobim ustma-ust */}
      <View style={styles.side}>
        <View style={[styles.periodBadge, isMyTurnNow && { backgroundColor: colors.positiveSoft }]}>
          <Text style={[styles.periodText, isMyTurnNow && { color: colors.positive }]}>
            {item.currentPeriod} / {item.totalPeriods}
          </Text>
        </View>

        {received > 0 || given > 0 ? (
          <View style={styles.totals}>
            <Text style={[styles.total, { color: colors.positive }]} numberOfLines={1}>
              + {formatGapAmount(received, unit)}
            </Text>
            <Text style={[styles.total, { color: colors.negative }]} numberOfLines={1}>
              − {formatGapAmount(given, unit)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    main: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xxs,
    },
    side: {
      alignItems: 'flex-end',
      gap: spacing.xxs,
    },
    name: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    periodBadge: {
      paddingVertical: 2,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    periodText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    totals: {
      alignItems: 'flex-end',
    },
    total: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    amount: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    amountSuffix: {
      fontWeight: '500',
      color: colors.textSecondary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

export default memo(GapRow);
