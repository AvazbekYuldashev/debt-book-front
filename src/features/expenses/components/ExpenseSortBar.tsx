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
      {/* Faol holatda yo'nalish o'qi BEZAK IKONKANING O'RNIGA chiqadi,
          yoniga emas: aks holda chip faollashganda kengayib ketar va
          qatordagi "Kategoriyalar" tabletkasini kesardi. Bezak ikonka
          qaysi ustun ekanini bildiradi, lekin buni yozuvning o'zi ham
          aytadi — o'q esa faqat faol holatda ma'noli. */}
      <Ionicons
        name={active ? (sortDir === 'asc' ? 'arrow-up' : 'arrow-down') : iconName}
        size={14}
        color={active ? colors.primary : colors.textSecondary}
      />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.bar}>
      {renderChip(sortKey === 'name', 'text', t('expenses.sortName'), onToggleName)}
      {renderChip(sortKey === 'sum', 'cash-outline', t('expenses.sortSum'), onToggleSum)}

    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    // Pastki chekinish YO'Q: qator endi bo'lim sarlavhasining ichida,
    // uning o'ng tomonida turadi va vertikal ritmni sarlavha belgilaydi.
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      flexShrink: 1,
      minWidth: 0,
    },
    // Chekinish tor: chiplar endi sarlavha tabletkasi bilan BITTA
    // qatorda va 375px li ekranda ikkalasiga joy yetishi kerak.
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: spacing.xxs + 2,
      paddingVertical: spacing.xxs + 2,
      borderRadius: radius.sm,
      ...glass.pane,
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
  });

export default memo(ExpenseSortBar);
