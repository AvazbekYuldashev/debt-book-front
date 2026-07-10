import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { formatMoney } from '../../utils/money';
import { normalizeCurrency } from '../../utils/currency';
import { formatDateShort, MappedTransaction } from './transactionMapping';

interface TransactionRowProps {
  tx: MappedTransaction;
  isLast: boolean;
  onPress: (tx: MappedTransaction) => void;
}

/**
 * Kontakt tarixidagi bitta tranzaksiya qatori: yo'nalish ikonkasi + sana, izoh
 * va summa "pill"i — har doim O'Z valyutasida (kursga o'girish yo'q). `memo`langan.
 */
const TransactionRow: React.FC<TransactionRowProps> = ({ tx, isLast, onPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isCredit = tx.kind === 'credit';
  const currency = normalizeCurrency(tx.currency);
  const description = tx.description?.trim();

  const handlePress = useCallback(() => onPress(tx), [onPress, tx]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${tx.label}: ${formatMoney(tx.amount, currency)}`}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: isCredit ? colors.primarySoft : colors.dangerMuted }]}>
          <Ionicons
            name={isCredit ? 'arrow-up-outline' : 'arrow-down-outline'}
            size={14}
            color={isCredit ? colors.positive : colors.negative}
          />
        </View>
        <Text style={styles.date}>{formatDateShort(tx.createdDate)}</Text>
      </View>

      <View style={styles.labelWrap}>
        <Text style={styles.label} numberOfLines={2}>
          {description || tx.label}
        </Text>
        {description ? <Text style={styles.labelSub}>{tx.label}</Text> : null}
      </View>

      <View style={styles.amountWrap}>
        <View style={[styles.pill, { backgroundColor: isCredit ? colors.positiveSoft : colors.negativeSoft }]}>
          <Text style={[styles.amount, { color: isCredit ? colors.positive : colors.negative }]}>
            {formatMoney(tx.amount, currency)}
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
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    left: {
      width: 120,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs + 2,
    },
    iconWrap: {
      width: 24,
      height: 24,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    date: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    labelWrap: {
      flex: 1,
    },
    label: {
      ...typography.bodySmall,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    labelSub: {
      ...typography.caption,
      marginTop: spacing.xxs / 2,
      fontSize: 11,
      color: colors.textSecondary,
    },
    amountWrap: {
      alignItems: 'flex-end',
      gap: spacing.xxs / 2,
    },
    pill: {
      paddingHorizontal: spacing.xs + 2,
      paddingVertical: spacing.xxs + 1,
      borderRadius: radius.pill,
    },
    amount: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '800',
    },
  });

export default memo(TransactionRow);
