import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAppTheme } from '../../../shared/theme';
import type { ColorTokens } from '../../../shared/theme/colors';

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

const RADIUS = 28;

/**
 * Kirish ekranlarining asosiy harakat tugmasi.
 *
 * GRADIENT `react-native-svg` bilan chiziladi: loyihada gradient kutubxonasi
 * yo'q va bitta tugma uchun yangisini qo'shish ortiqcha. Svg allaqachon
 * ishlatiladi (AmbientBackground) va u web'da ham, qurilmada ham bir xil
 * ishlaydi.
 *
 * O'LCHAM O'LCHANMAYDI: to'rtburchak eni va balandligi foizda beriladi,
 * shuning uchun tugma kengligi o'zgarsa gradient o'zi moslashadi va
 * birinchi kadrda "bo'sh" ko'rinmaydi.
 *
 * Rang mavzuga qarab keladi - qorong'ida ochroq gradient va qora matn,
 * yorug'da to'yingan gradient va oq matn.
 */
const AuthButton: React.FC<AuthButtonProps> = ({ label, onPress, loading, disabled, testID }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const blocked = Boolean(loading || disabled);

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: Boolean(loading) }}
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, blocked && styles.blocked]}
    >
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="authCta" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.ctaGradientStart} />
              <Stop offset="1" stopColor={colors.ctaGradientEnd} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" rx={RADIUS} fill="url(#authCta)" />
        </Svg>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.ctaText} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
};

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    button: {
      height: 56,
      borderRadius: RADIUS,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      // Soya gradientning o'z rangida: tugma sahifadan "ko'tarilib" turadi.
      shadowColor: colors.ctaGradientEnd,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 4,
    },
    pressed: {
      opacity: 0.85,
    },
    // O'chirilgan tugma ham o'qiladi, lekin bosilmasligi ko'rinib turadi.
    blocked: {
      opacity: 0.55,
    },
    label: {
      color: colors.ctaText,
      fontSize: 16,
      fontWeight: '700',
    },
  });

export default AuthButton;
