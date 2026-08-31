import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatPhoneDisplay } from '../../../shared/lib/phone';
import { GapMemberDTO, GapUnit, toAmount } from '../types/gap';
import { formatGapAmount } from '../model/gapFormat';

interface GapMemberRowProps {
  item: GapMemberDTO;
  unit: GapUnit;
  /**
   * Joriy davrning oluvchisi belgilanganmi. Belgilanmagan bo'lsa to'lov
   * qatorlari hali yaratilmagan — "to'lamadi" deyish noto'g'ri bo'lardi.
   */
  periodReady?: boolean;
  /** Bosilganda a'zoning hisob-kitobi ochiladi. */
  onPress?: (item: GapMemberDTO) => void;
}

/**
 * A'zolar ro'yxatidagi bitta qator. Ataylab qisqa: ism-familiya, telefon,
 * shu oygi to'lov summasi va to'ladi/to'lamadi holati — boshqa hech narsa.
 *
 * Shu oy kassani oladigan a'zo bu davrda to'lamaydi (TZ 06), shuning uchun
 * uning summasi bo'lmaydi va holat o'rniga "shu oy oladi" turadi.
 */
const GapMemberRow: React.FC<GapMemberRowProps> = ({ item, unit, periodReady = true, onPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isPaid = item.currentPeriodStatus === 'CONFIRMED' || item.currentPeriodStatus === 'PAID';

  const statusLabel = !periodReady
    ? t('gap.statusQueuePending')
    : item.receiverThisPeriod
      ? t('gap.statusReceiver')
      : isPaid
        ? t('gap.statusPaid')
        : t('gap.statusUnpaid');

  const statusColor = !periodReady
    ? colors.textSecondary
    : item.receiverThisPeriod
      ? colors.primary
      : isPaid
        ? colors.positive
        : colors.negative;

  const statusSoft = !periodReady
    ? colors.surfaceMuted
    : item.receiverThisPeriod
      ? colors.primarySoft
      : isPaid
        ? colors.positiveSoft
        : colors.negativeSoft;

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={item.memberName}
    >
      <View style={styles.nameWrap}>
        <Text style={styles.name} numberOfLines={1}>
          {item.memberName}
          {item.me ? <Text style={styles.meTag}> · {t('gap.me')}</Text> : null}
        </Text>
        <Text style={styles.phone} numberOfLines={1}>
          {formatPhoneDisplay(item.memberPhone ?? undefined, '—')}
        </Text>
      </View>

      <View style={styles.rightWrap}>
        <Text style={[styles.amount, { color: statusColor }]} numberOfLines={1}>
          {!periodReady || item.currentPeriodAmount == null
            ? '—'
            : formatGapAmount(toAmount(item.currentPeriodAmount), unit)}
        </Text>
        <View style={[styles.statusChip, { backgroundColor: statusSoft }]}>
          <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    nameWrap: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      ...typography.body,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    meTag: {
      fontWeight: '600',
      color: colors.primary,
    },
    phone: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    rightWrap: {
      alignItems: 'flex-end',
      gap: 3,
    },
    amount: {
      ...typography.caption,
      fontSize: 14,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    statusChip: {
      paddingVertical: 2,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.pill,
    },
    statusText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
    },
  });

export default memo(GapMemberRow);
