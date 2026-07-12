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
 * yuqorida katta rangli summa (o'z valyutasida, kursga o'girish yo'q),
 * pastda kichik sana-vaqt va uning yonida izoh. "Qarz olindi"/"Haq berildi"
 * matni ko'rsatilmaydi (yo'nalishni ikonka va rang bildiradi). `memo`langan.
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
        <View style={styles.metaRow}>
          <Text style={styles.date}>{formatDateShort(tx.createdDate)}</Text>
          {description ? (
            <Text style={styles.description} numberOfLines={1}>
              {description}
            </Text>
          ) : null}
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
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
    },
    amount: {
      ...typography.bodySmall,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xxs / 2,
    },
    date: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    description: {
      ...typography.caption,
      flexShrink: 1,
      color: colors.textSecondary,
    },
  });

export default memo(TransactionRow);
