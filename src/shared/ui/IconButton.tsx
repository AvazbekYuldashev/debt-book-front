import React, { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  /**
   * `ghost`  — fon yo'q, faqat bosilganda ko'rinadi (odatiy).
   * `soft`   — doimiy yumshoq fon: karta sarlavhasida ajralib turishi kerak bo'lsa.
   * `accent` — asosiy rangdagi yumshoq fon: qatordagi ASOSIY amal.
   */
  variant?: 'ghost' | 'soft' | 'accent';
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Amal bajarilmoqda: ikonka o'rniga aylanma chiqadi va tugma bloklanadi. */
  loading?: boolean;
  /** Ikonka rangi — odatiy: ikkinchi darajali matn rangi. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

// Ko'rinadigan o'lcham ataylab kichik: ro'yxatda tugma emas, ISM va SUMMA
// yetakchi bo'lishi kerak. Teginish maydoni esa hitSlop bilan 44px ga
// yetkaziladi — ko'z uchun ixcham, barmoq uchun keng.
const BOX = { sm: 28, md: 36 } as const;
const GLYPH = { sm: 15, md: 18 } as const;
const HIT = { sm: 8, md: 4 } as const;

/**
 * Ikonkali tugma — butun ilova bo'ylab yagona ko'rinish.
 *
 * Ilgari har joyda o'z varianti bor edi: 28x28, 30x30, 32x32 — bir xil
 * vazifadagi tugmalar uch xil o'lchamda, hammasi doimiy kulrang qutida.
 * Ro'yxatda har qatorda takrorlanib, kontent bilan raqobatlashardi va
 * 28px barmoq uchun juda kichik edi (tavsiya etilgani 44px).
 *
 * Odatiy `ghost` varianti fonsiz: ikonka o'zi ko'rinadi, fon faqat
 * bosilganda chiqadi. Ro'yxat qatori o'zi ham bosiladi — undagi tugma
 * ikkinchi darajali amal, shuning uchun tinch turishi kerak.
 */
const IconButton: React.FC<IconButtonProps> = ({
  name,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  size = 'sm',
  disabled = false,
  loading = false,
  color,
  style,
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const box = BOX[size];
  const tint =
    color ?? (variant === 'accent' ? theme.colors.primary : theme.colors.textSecondary);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={HIT[size]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[{ width: box, height: box }, styles.base, disabled && styles.disabled, style]}
    >
      {({ pressed }) => (
        <>
          {/* Fon alohida qatlam: bosilganda ikonka emas, FON o'zgaradi —
              ikonkaning o'zi xiralashsa tugma "o'chgan"dek ko'rinardi. */}
          <View
            style={[
              styles.backdrop,
              variant === 'soft' && styles.soft,
              variant === 'accent' && styles.accent,
              pressed && styles.pressed,
            ]}
          />
          {loading ? (
            <ActivityIndicator size="small" color={tint} />
          ) : (
            <Ionicons name={name} size={GLYPH[size]} color={tint} />
          )}
        </>
      )}
    </Pressable>
  );
};

const createStyles = ({ colors }: ThemeValue) =>
  StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 999,
    },
    soft: {
      backgroundColor: colors.surfaceMuted,
    },
    accent: {
      backgroundColor: colors.primarySoft,
    },
    pressed: {
      backgroundColor: colors.border,
    },
    disabled: {
      opacity: 0.4,
    },
  });

export default memo(IconButton);
