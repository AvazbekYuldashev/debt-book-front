import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

const PULSE_MS = 1000;
/** Cheksiz emas, chekli takror: web'da doimiy rAF batareyani yeydi. */
const PULSE_ITERATIONS = 4;

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
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
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
      >
        <Ionicons name={iconName} size={30} color={colors.textOnPrimary} />
      </Pressable>
    </Animated.View>
  );
};

const createStyles = ({ colors, spacing, radius }: ThemeValue) =>
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
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
    disabled: {
      opacity: 0.5,
    },
  });

export default memo(FloatingActionButton);
