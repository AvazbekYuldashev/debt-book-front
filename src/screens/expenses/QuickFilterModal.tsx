import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';

export type QuickFilterKey = 'today' | 'currentWeek' | 'currentMonth' | 'customRange';

interface QuickFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: QuickFilterKey) => void;
}

/** Tez sana filtri tanlash oynasi (bugun / hafta / oy / oraliq bo'yicha). */
const QuickFilterModal: React.FC<QuickFilterModalProps> = ({ visible, onClose, onSelect }) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const items: { key: QuickFilterKey; label: string }[] = [
    { key: 'today', label: t('expenses.today') },
    { key: 'currentWeek', label: t('expenses.thisWeek') },
    { key: 'currentMonth', label: t('expenses.thisMonth') },
    { key: 'customRange', label: t('expenses.byDate') },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('expenses.chooseFilter')}</Text>
          {items.map((item) => (
            <Pressable
              key={item.key}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={() => onSelect(item.key)}
              accessibilityRole="button"
            >
              <Text style={styles.itemText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.xs,
      overflow: 'hidden',
    },
    title: {
      ...typography.button,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    item: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    itemPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    itemText: {
      ...typography.bodySmall,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
  });

export default QuickFilterModal;
