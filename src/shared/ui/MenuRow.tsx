import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

export interface MenuRowProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** O'ng chetdagi qism: kalit, belgi yoki hisob. Bo'lmasa — strelka. */
  trailing?: React.ReactNode;
  /** Oxirgi qatorda ajratuvchi chiziq chizilmaydi. */
  isLast?: boolean;
  disabled?: boolean;
}

/**
 * Menyu qatori: chapda ikonka, yonida yozuv, o'ngda strelka.
 *
 * IKONKA RANGSIZ va FONSIZ. Ilgari u yumaloq yashil doira ichida
 * turardi: har qator o'ziga e'tibor tortib, ro'yxat "tugmalar to'plami"
 * bo'lib ko'rinardi va ko'z nimaga qarashni bilmasdi. Rangsiz kontur
 * esa ikonkani YORLIQNING belgisi qiladi - o'qiladigan narsa matn,
 * ikonka faqat uni tezroq topishga yordam beradi.
 *
 * Shu sababli bu yerda brand rangi ATAYIN ishlatilmaydi. Rang ilovada
 * ma'no tashiydi (qarz qizil, haq yashil) - menyuda esa tanlanadigan
 * narsa yo'q, demak ajratadigan ma'no ham yo'q.
 *
 * O'LCHAMLAR QAT'IY, mavzudan olinmaydi: barcha menyu qatorlari bir xil
 * balandlikda turishi kerak, aks holda ro'yxat "tishli" ko'rinardi.
 */
const MenuRow: React.FC<MenuRowProps> = ({ label, icon, onPress, trailing, isLast, disabled }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.divider,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={ICON_SIZE} color={theme.colors.textSecondary} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {trailing ?? (
        onPress ? (
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        ) : null
      )}
    </Pressable>
  );
};

/** Telegram'dagi kabi: yozuvdan sezilarli katta, lekin bosiq. */
const ICON_SIZE = 22;

const createStyles = ({ colors }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      // Barmoq uchun qulay balandlik; ikonka va yozuv orasi keng, shuning
      // uchun qator siqilgandek ko'rinmaydi.
      minHeight: 52,
      gap: 18,
    },
    divider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    label: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    pressed: {
      opacity: 0.6,
    },
    disabled: {
      opacity: 0.45,
    },
  });

export default memo(MenuRow);
