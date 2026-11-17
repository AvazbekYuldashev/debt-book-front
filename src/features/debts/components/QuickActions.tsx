import React, { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { FOCUS_INSET } from '../../../shared/ui/focusRing';

export interface QuickAction {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

/**
 * Balans kartasi ostidagi TEZ AMALLAR qatori.
 *
 * Har amal — kichik kvadrat plita: tepada doiradagi ikonka, ostida ikki
 * qatorgacha nom. Qator GORIZONTAL suriladi: plitalar ekranga sig'masa
 * siqilib, nomlari o'qib bo'lmas holga kelardi; surilish esa kenglikdan
 * qat'i nazar bir xil ishlaydi.
 *
 * Qatordagi amallar pastki paneldagi tablar bilan TAKRORLANISHI mumkin
 * va bu ataylab: panel "qayerdaman" degan savolga javob beradi, bu
 * qator esa "hozir nima qilaman" degan savolga — eng tez-tez bosiladigan
 * amallar barmoq yetadigan joyda turadi.
 */
const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={action.onPress}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          dataSet={FOCUS_INSET}
        >
          <View style={styles.icon}>
            <Ionicons name={action.icon} size={20} color={colors.primary} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass, shadows }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    tile: {
      width: 92,
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.lg,
      ...glass.surface,
      ...shadows.card,
    },
    pressed: {
      opacity: 0.7,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    label: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      color: colors.textPrimary,
    },
  });

export default memo(QuickActions);
