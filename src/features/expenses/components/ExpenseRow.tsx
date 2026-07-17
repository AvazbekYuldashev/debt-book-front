import React, { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import Card from '../../../shared/ui/Card';
import { formatMoney } from '../../../shared/lib/money';
import { formatPhoneDisplay } from '../../../shared/lib/phone';
import type { ExpenseResponseDTO } from '../types/expense';

interface ExpenseRowProps {
  expense: ExpenseResponseDTO;
  allowDelete: boolean;
  deleting: boolean;
  onDelete: (id: string) => void;
}

/** Bitta xarajat yozuvi kartasi: summa, izoh, sana, kim qo'shgani va o'chirish tugmasi. */
const ExpenseRow: React.FC<ExpenseRowProps> = ({ expense, allowDelete, deleting, onDelete }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const amountValue = typeof expense.amount === 'string' ? Number(expense.amount) : expense.amount;
  const handleDelete = useCallback(() => onDelete(expense.id), [onDelete, expense.id]);

  return (
    <Card style={styles.card}>
      <View style={styles.main}>
        <Text style={styles.amount}>{formatMoney(amountValue || 0)}</Text>
        <Text style={styles.description}>{expense.description || t('expenses.noComment')}</Text>
        {expense.createdDate ? (
          <Text style={styles.date}>{new Date(expense.createdDate).toLocaleString()}</Text>
        ) : null}
        {expense.creatorPhone ? (
          <Text style={styles.creator}>
            {t('expenses.addedBy')}: {formatPhoneDisplay(expense.creatorPhone)}
          </Text>
        ) : null}
      </View>
      {allowDelete ? (
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          onPress={handleDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel={t('common.delete')}
          hitSlop={4}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          )}
        </Pressable>
      ) : null}
    </Card>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    main: {
      flex: 1,
    },
    amount: {
      ...typography.body,
      fontSize: 16,
      fontWeight: '700',
      color: colors.danger,
    },
    description: {
      ...typography.caption,
      marginTop: spacing.xxs,
      fontSize: 13,
      color: colors.textPrimary,
    },
    date: {
      ...typography.caption,
      marginTop: spacing.xxs,
      color: colors.textSecondary,
    },
    creator: {
      ...typography.caption,
      marginTop: spacing.xxs / 2,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    iconBtnPressed: {
      opacity: 0.6,
    },
  });

export default memo(ExpenseRow);
