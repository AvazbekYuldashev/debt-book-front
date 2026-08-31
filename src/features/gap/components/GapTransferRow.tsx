import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatPhoneDisplay } from '../../../shared/lib/phone';
import { formatGapAmount } from '../model/gapFormat';
import { GapTransferDTO, GapUnit, toAmount } from '../types/gap';

interface GapTransferRowProps {
  item: GapTransferDTO;
  unit: GapUnit;
  /** Kirim yashil (pul keldi), chiqim qizil (pul ketdi). */
  direction: 'in' | 'out';
  /** Berilsa qator bosiladigan bo'ladi — tasdiqlash shu yerdan qilinadi. */
  onPress?: (item: GapTransferDTO) => void;
}

/**
 * Hisob-kitobdagi bitta yozuv: qarama-qarshi tomon, nechanchi davr va summa.
 *
 * Ikki tomon tasdiqlamagan yozuv "kutilmoqda" deb belgilanadi va rangi
 * so'nadi — TZ 09 ga ko'ra faqat ikki tomonlama tasdiq yakuniy hisoblanadi.
 */
const GapTransferRow: React.FC<GapTransferRowProps> = ({ item, unit, direction, onPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const color = direction === 'in' ? colors.positive : colors.negative;
  const sign = direction === 'in' ? '+' : '−';

  const actionable = onPress != null;

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      disabled={!actionable}
      style={({ pressed }) => [styles.row, actionable && pressed && styles.rowPressed]}
      accessibilityRole={actionable ? 'button' : undefined}
      accessibilityLabel={item.counterpartyName ?? undefined}
    >
      <View style={styles.nameWrap}>
        <Text style={styles.name} numberOfLines={1}>
          {item.counterpartyName ?? '—'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatPhoneDisplay(item.counterpartyPhone ?? undefined, '—')}
          {item.periodNumber != null
            ? ` · ${t('gap.periodShort', { period: String(item.periodNumber) })}`
            : ''}
        </Text>
      </View>

      <View style={styles.rightWrap}>
        <Text
          style={[styles.amount, { color }, !item.confirmed && styles.amountPending]}
          numberOfLines={1}
        >
          {sign} {formatGapAmount(toAmount(item.amount), unit)}
        </Text>
        {!item.confirmed ? (
          <Text style={styles.pendingText}>
            {item.periodClosed ? t('gap.periodClosed') : t('gap.statusWaiting')}
          </Text>
        ) : null}
      </View>

      {actionable ? (
        <Ionicons name="checkmark-circle-outline" size={20} color={colors.positive} />
      ) : null}
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      marginHorizontal: spacing.md,
      backgroundColor: colors.surface,
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
      fontWeight: '600',
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    rightWrap: {
      alignItems: 'flex-end',
    },
    amount: {
      ...typography.caption,
      fontSize: 14,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    amountPending: {
      opacity: 0.45,
    },
    pendingText: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textSecondary,
    },
  });

export default memo(GapTransferRow);
