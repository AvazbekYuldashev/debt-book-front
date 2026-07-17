import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';

// Kategoriyalar ro'yxati saralash kaliti va yo'nalishi.
export type ExpenseSortKey = 'default' | 'name' | 'sum';
export type SortDir = 'asc' | 'desc';

interface ExpenseSortBarProps {
  sortKey: ExpenseSortKey;
  sortDir: SortDir;
  onToggleName: () => void;
  onToggleSum: () => void;
  onReset: () => void;
}

/**
 * Xarajat kategoriyalarini saralash paneli: "Nomi" (A-Z / Z-A) va "Summa"
 * (katta/kichik) chiplari. Aktiv chip ajralib turadi va yo'nalish o'qini
 * ko'rsatadi; aktiv chipni qayta bosish yo'nalishni almashtiradi. "Standart"
 * tugmasi odatiy tartibga (pin yuqorida) qaytaradi. Qarzlar bo'limidagi
 * saralash uslubiga hamohang.
 */
const ExpenseSortBar: React.FC<ExpenseSortBarProps> = ({
  sortKey,
  sortDir,
  onToggleName,
  onToggleSum,
  onReset,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderChip = (
    active: boolean,
    iconName: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
  ) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Ionicons name={iconName} size={14} color={active ? colors.primary : colors.textSecondary} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {active ? (
        <Ionicons
          name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'}
          size={12}
          color={colors.primary}
        />
      ) : null}
    </Pressable>
  );

  return (
    <View style={styles.bar}>
      {renderChip(sortKey === 'name', 'text', t('expenses.sortName'), onToggleName)}
      {renderChip(sortKey === 'sum', 'cash-outline', t('expenses.sortSum'), onToggleSum)}

      {sortKey !== 'default' ? (
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [styles.resetChip, pressed && styles.chipPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('expenses.sortReset')}
        >
          <Ionicons name="refresh" size={12} color={colors.textSecondary} />
          <Text style={styles.resetText}>{t('expenses.sortReset')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs + 2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    chipPressed: {
      opacity: 0.6,
    },
    chipText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.primary,
    },
    resetChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs + 2,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    resetText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
  });

export default memo(ExpenseSortBar);
