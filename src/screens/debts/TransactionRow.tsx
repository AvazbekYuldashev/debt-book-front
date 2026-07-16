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
 * Kontakt tarixidagi bitta tranzaksiya qatori: chapda yo'nalish ikonkasi,
 * o'rtada katta rangli summa (o'z valyutasida, kursga o'girish yo'q) va
 * pastida sana, o'ngda izoh (uzun bo'lsa ko'p qatorga o'tib, qator
 * balandligi shunga qarab o'sadi). "Qarz olindi"/"Haq berildi" matni
 * ko'rsatilmaydi (yo'nalishni ikonka va rang bildiradi). `memo`langan.
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
      <View style={[styles.iconWrap, { backgroundColor: isCredit ? colors.primarySoft : colors.dangerMuted }]}>
        <Ionicons
          name={isCredit ? 'arrow-up-outline' : 'arrow-down-outline'}
          size={16}
          color={isCredit ? colors.positive : colors.negative}
        />
      </View>

      <View style={styles.body}>
        <Text
          style={[styles.amount, { color: isCredit ? colors.positive : colors.negative }]}
          numberOfLines={1}
        >
          {formatMoney(tx.amount, currency)}
        </Text>
        <Text style={styles.date}>{formatDateShort(tx.createdDate)}</Text>
      </View>

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
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
    },
    date: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs / 2,
    },
    description: {
      ...typography.caption,
      flexShrink: 1,
      flexGrow: 2,
      flexBasis: 0,
      minWidth: 0,
      marginLeft: spacing.md,
      textAlign: 'right',
      color: colors.textSecondary,
    },
  });

export default memo(TransactionRow);
