import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

const PULSE_MS = 1000;
/** Cheksiz emas, chekli takror: web'da doimiy rAF batareyani yeydi. */
const PULSE_ITERATIONS = 4;
// Web'da native driver yo'q (PressableScale bilan bir xil qoida): `true`
// berilsa RNW har safar ogohlantirib, baribir JS'da animatsiya qiladi.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface FloatingActionButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  /** Ro'yxat bo'sh bo'lganda diqqatni tortish uchun qisqa pulsatsiya. */
  pulse?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
}

/**
 * Ekranning pastki o'ng burchagidagi asosiy "qo'shish" tugmasi.
 *
 * Bitta komponent — chunki ilgari har bir ekran o'z nusxasini chizardi va
 * ular asta-sekin bir-biridan farq qila boshlagandi (biri pulsatsiyalanardi,
 * boshqasi yo'q; bosilganda biri kichrayardi, boshqasi shaffoflashardi).
 */
const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  accessibilityLabel,
  pulse = false,
  disabled = false,
  iconName = 'add',
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse || disabled) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      { iterations: PULSE_ITERATIONS }
    );
    loop.start();
    return () => {
      loop.stop();
      scale.setValue(1);
    };
  }, [pulse, disabled, scale]);

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
      >
        <Ionicons
          name={iconName}
          size={30}
          // O'chiq tugma neytral sirtda - oq glif unda ko'rinmasdi.
          color={disabled ? colors.textSecondary : colors.textOnPrimary}
        />
      </Pressable>
    </Animated.View>
  );
};

const createStyles = ({ colors, spacing, radius, shadows }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      right: spacing.md + 2,
      bottom: spacing.lg,
    },
    button: {
      width: 60,
      height: 60,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
      elevation: 10,
    },
    // Bosilish RANG bilan (Button bilan bir xil): yarim shaffof tugma
    // ortidagi fon rasmini ko'rsatib, xira dog'ga aylanardi.
    pressed: {
      backgroundColor: colors.primaryPressed,
      transform: [{ scale: 0.96 }],
    },
    /**
     * O'chiq holat - ovoz tugmasining o'chiq holati bilan BIR XIL retsept:
     * to'liq neytral sirt, chegara, neytral soya. `opacity` fon rasmi
     * ustida tugmani "singan" shaffof dog'ga aylantirardi, yashil nur
     * esa bosib bo'lmaydigan tugmani faol qilib ko'rsatardi.
     */
    disabled: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.floating,
    },
  });

export default memo(FloatingActionButton);
