import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import { formatMoney } from '../../utils/money';

interface ExpenseTotalCardProps {
  label: string;
  amount: number;
  onMenuPress: () => void;
}

/** Tanlangan oraliqdagi umumiy xarajat summasi + filtr menyusi tugmasi. */
const ExpenseTotalCard: React.FC<ExpenseTotalCardProps> = ({ label, amount, onMenuPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name="wallet-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(amount)}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.menuBtn, pressed && styles.pressed]}
        onPress={onMenuPress}
        accessibilityRole="button"
        accessibilityLabel={t('expenses.chooseFilter')}
        hitSlop={6}
      >
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.md + 2,
      marginBottom: spacing.md,
      marginHorizontal: spacing.md,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    textWrap: {
      flex: 1,
    },
    label: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xxs,
    },
    value: {
      ...typography.heading2,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.2,
      color: colors.primary,
    },
    menuBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default memo(ExpenseTotalCard);
