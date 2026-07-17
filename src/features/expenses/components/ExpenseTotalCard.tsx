import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';

interface ExpenseTotalCardProps {
  label: string;
  amount: number;
  onMenuPress: () => void;
}

// Summa uzun bo'lganda shriftni kichraytiramiz. `adjustsFontSizeToFit` web'da
// (react-native-web) ishlamaydi — shuning uchun matn uzunligiga qarab qo'lda
// moslаymiz. Katta summalar ("5 000 000 012 333 so'm") ham to'liq ko'rinadi.
const valueFontSize = (length: number): number => {
  if (length <= 16) return 22;
  if (length <= 22) return 19;
  if (length <= 28) return 16;
  return 14;
};

/** Tanlangan oraliqdagi umumiy xarajat summasi + filtr menyusi tugmasi. */
const ExpenseTotalCard: React.FC<ExpenseTotalCardProps> = ({ label, amount, onMenuPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const valueText = formatMoney(amount);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.icon}>
          <Ionicons name="wallet-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
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

      <Text style={[styles.value, { fontSize: valueFontSize(valueText.length) }]} numberOfLines={1}>
        {valueText}
      </Text>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md + 2,
      marginBottom: spacing.md,
      marginHorizontal: spacing.md,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    icon: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    label: {
      ...typography.caption,
      flex: 1,
      color: colors.textSecondary,
    },
    value: {
      ...typography.heading2,
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
