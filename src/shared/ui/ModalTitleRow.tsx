import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

/**
 * Oyna sarlavhasi va YOPISH tugmasi — barcha dialoglar uchun bitta qolip.
 *
 * Ilgari har oyna o'zicha yopilardi: biri yuqori o'ngdagi "×" bilan,
 * boshqasi pastdagi "Yopish" tugmasi bilan, uchinchisida esa umuman
 * yo'l yo'q edi (faqat qurilmaning orqaga tugmasi). Odam har oynada
 * yopish yo'lini qaytadan qidirardi.
 *
 * Endi qoida bitta: "×" DOIM yuqori o'ngda. Pastdagi tugmalar faqat
 * AMAL uchun qoladi (saqlash, bekor qilish) — "yopish" ular orasida
 * yo'qolib ketardi.
 *
 * Sarlavha o'z uslubini saqlaydi: bu komponent faqat QATOR beradi,
 * matnni emas — har oynaning sarlavhasi o'z o'lchamida qolsin.
 */
interface ModalTitleRowProps {
  /** Sarlavha matni (va kerak bo'lsa yonidagi boshqa elementlar). */
  children?: React.ReactNode;
  onClose: () => void;
  /** Qator uchun qo'shimcha uslub — masalan pastki bo'shliq. */
  style?: ViewStyle;
}

const ModalTitleRow: React.FC<ModalTitleRowProps> = ({ children, onClose, style }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.row, style]}>
      {/* Sarlavha o'sadi, tugma esa o'z o'lchamida qoladi: uzun nom
          tugmaning ustiga chiqib ketmaydi. */}
      <View style={styles.grow}>{children}</View>
      <ModalCloseButton onClose={onClose} />
    </View>
  );
};

/** Yolg'iz "×" — sarlavha qatori allaqachon bor oynalar uchun. */
export const ModalCloseButton: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useI18n();

  return (
    <Pressable
      onPress={onClose}
      hitSlop={8}
      style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('common.close')}
    >
      <Ionicons name="close" size={18} color={colors.textPrimary} />
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, radius }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    grow: {
      flex: 1,
      minWidth: 0,
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default ModalTitleRow;
