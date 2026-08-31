import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatGapAmount, formatGapDate } from '../model/gapFormat';
import { GapTransferDTO, toAmount, unitOf } from '../types/gap';

interface GapTransferRowProps {
  item: GapTransferDTO;
  /** Kirim yashil (pul keldi), chiqim qizil (pul ketdi). */
  direction: 'in' | 'out';
  isLast?: boolean;
  /** Berilsa qator bosiladigan bo'ladi — tasdiqlash shu yerdan qilinadi. */
  onPress?: (item: GapTransferDTO) => void;
}

/**
 * Oldi-berdi tarixidagi bitta yozuv — Qarzlar bo'limidagi tranzaksiya qatori
 * bilan bir xil ko'rinishda: chapda yo'nalish ikonkasi, o'rtada katta rangli
 * summa va ostida sana, o'ngda qarama-qarshi tomon.
 *
 * Summa yozuvning O'Z birligida chiqadi — bir odam bilan bir vaqtda so'm,
 * dollar va kg bo'yicha hisob yuritish mumkin.
 *
 * Summa hech qachon so'nmaydi: yozuv kiritilgan bo'lsa pul haqiqatda
 * ko'chgan va hisobga kirgan. Ikkinchi tomon hali tasdiqlamagan bo'lsa,
 * qator o'ng chetida "kutilmoqda" belgisi turadi — bu roziliq haqida,
 * pul haqida emas.
 */
const GapTransferRow: React.FC<GapTransferRowProps> = ({
  item,
  direction,
  isLast = false,
  onPress,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isIn = direction === 'in';
  const color = isIn ? colors.positive : colors.negative;
  const actionable = onPress != null;

  const note = item.note?.trim();
  // Har yozuv o'z birligida ko'rsatiladi: bitta ro'yxatda so'm ham,
  // dollar ham, kg ham bo'lishi mumkin.
  const unit = unitOf(item);

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      disabled={!actionable}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        actionable && pressed && styles.rowPressed,
      ]}
      accessibilityRole={actionable ? 'button' : undefined}
      accessibilityLabel={item.counterpartyName ?? undefined}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: isIn ? colors.positiveSoft : colors.negativeSoft },
        ]}
      >
        <Ionicons
          name={isIn ? 'arrow-down-outline' : 'arrow-up-outline'}
          size={16}
          color={color}
        />
      </View>

      <View style={styles.body}>
        <Text style={[styles.amount, { color }]} numberOfLines={1}>
          {formatGapAmount(toAmount(item.amount), unit)}
        </Text>
        <Text style={styles.date} numberOfLines={1}>
          {formatGapDate(item.date)}
        </Text>
      </View>

      <View style={styles.side}>
        <Text style={styles.counterparty} numberOfLines={1}>
          {item.counterpartyName ?? '—'}
        </Text>
        {note ? (
          <Text style={styles.note} numberOfLines={1}>
            {note}
          </Text>
        ) : null}
        {!item.confirmed ? (
          <Text style={styles.pendingText} numberOfLines={1}>
            {t('gap.statusWaiting')}
          </Text>
        ) : null}
      </View>

      {actionable ? (
        <Ionicons name="checkmark-circle-outline" size={20} color={colors.positive} />
      ) : null}
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingLeft: spacing.sm,
      paddingRight: spacing.md,
      paddingVertical: spacing.sm,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flexShrink: 1,
      flexGrow: 3,
      flexBasis: 0,
      minWidth: 0,
    },
    amount: {
      ...typography.bodySmall,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
      fontVariant: ['tabular-nums'],
    },
    date: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs / 2,
      fontVariant: ['tabular-nums'],
    },
    side: {
      flexShrink: 1,
      flexGrow: 2,
      flexBasis: 0,
      minWidth: 0,
      marginLeft: spacing.md,
      alignItems: 'flex-end',
    },
    counterparty: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'right',
    },
    note: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'right',
      marginTop: spacing.xxs / 2,
    },
    pendingText: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: spacing.xxs / 2,
    },
  });

export default memo(GapTransferRow);
