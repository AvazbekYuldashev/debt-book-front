import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

/**
 * Ko'rinadigan quti = teginish maydoni (44px, tavsiya etilgan minimum).
 *
 * Ilgari 32px kvadrat + hitSlop edi: Qarzlar sarlavhasidagi 48px li
 * qo'ng'iroq/qidiruv chiplari yonida u ekran chetiga qisilgan mayda
 * tugma bo'lib ko'rinardi. Radius o'sha chiplardan (radius.lg) - bir
 * oila bo'lib o'qilsin.
 */
const BACK_SIZE = 44;
const BACK_GLYPH = 22;

interface BackButtonProps {
  onPress: () => void;
}

/**
 * Butun ilova bo'yicha bitta izchil "orqaga" tugmasi (shisha chip, chevron ikonkasi).
 * ScreenHeader, ContactBalanceHeader va GapMemberBalanceHeader shu komponentni
 * ishlatadi — orqaga tugmasi qayerda bo'lishidan qat'i nazar bir xil ko'rinadi.
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
    >
      <Ionicons name="chevron-back" size={BACK_GLYPH} color={theme.colors.textPrimary} />
    </Pressable>
  );
};

const createStyles = ({ radius, glass }: ThemeValue) =>
  StyleSheet.create({
    // Chegara FAQAT shisha tokenidan (nozik glassBorder). Ustidan yana
    // `colors.border` berilganda qirra boshqa chiplardan qalinroq chiqardi.
    button: {
      width: BACK_SIZE,
      height: BACK_SIZE,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      ...glass.surface,
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default memo(BackButton);
