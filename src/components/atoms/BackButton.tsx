import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';

interface BackButtonProps {
  onPress: () => void;
}

/**
 * Butun ilova bo'yicha bitta izchil "orqaga" tugmasi (chegarali kvadrat, chevron ikonkasi).
 * ScreenHeader va ContactBalanceHeader shu komponentni ishlatadi — orqaga tugmasi
 * qayerda bo'lishidan qat'i nazar bir xil ko'rinadi.
 */
const BackButton: React.FC<BackButtonProps> = ({ onPress }) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={6}
    >
      <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
    </Pressable>
  );
};

const createStyles = ({ colors, radius }: ThemeValue) =>
  StyleSheet.create({
    button: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default memo(BackButton);
