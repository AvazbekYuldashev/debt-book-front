import React, { memo, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  PressableStateCallbackType,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '../theme';

/**
 * - primary   : asosiy amal, to'liq rangli.
 * - secondary / outline : ikkinchi darajali amal (Bekor qilish, Chiqish) -
 *   shisha sirt + brend rangidagi kontur. Ikkalasi bir xil ko'rinadi; nom
 *   chaqiruvchining niyatini bildiradi.
 * - danger    : QAYTARIB BO'LMAYDIGAN amal (profilni o'chirish). Shakli
 *   outline bilan bir, lekin rangi xavf rangi: yashil ilovada "xavfsiz"
 *   degani, o'chirishni unga kiyintirish adashtirardi.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  onHapticFeedback?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  onHapticFeedback,
}) => {
  const { colors, spacing, typography, glass, shadows } = useAppTheme();
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;
  const useNativeDriver = Platform.OS !== 'web';

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    onHapticFeedback?.();
    onPress();
  }, [isDisabled, onHapticFeedback, onPress]);

  const animateScale = useCallback((toValue: number) => {
    Animated.spring(scale, {
      toValue,
      speed: 24,
      bounciness: toValue < 1 ? 0 : 7,
      useNativeDriver,
    }).start();
  }, [scale, useNativeDriver]);

  const getContainerStyle = useCallback(({ pressed }: PressableStateCallbackType) => {
    const base: ViewStyle = {
      minHeight: 48,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: isDisabled ? 0.6 : pressed ? 0.86 : 1,
      // Soya kartalarniki bilan bitta tokendan: rangi mavzudan (yorug'da
      // navy, qorong'ida qora). Qattiq '#000' yorug' ekranda iflos ko'rinardi.
      ...shadows.card,
    };

    if (variant === 'primary') {
      return [
        base,
        {
          backgroundColor: pressed ? colors.primaryPressed : colors.primary,
          borderWidth: 0,
          // Fon QATTIQ - Android soyani kontur bo'yicha to'g'ri chizadi
          // (elevation.ts, FAB kabi). shadows.card u yerda shisha uchun 0
          // beradi va asosiy tugma tekis bo'lib qolardi.
          elevation: 2,
        },
      ];
    }

    // Shisha sirt: fon rasmi ustida muzli va "Shaffoflik" ga bo'ysunadi -
    // ilgari tekis oq/navy plita bo'lib, yonidagi shisha kartalar orasida
    // begona ko'rinardi. Modal ichida pane uning QUYUQ sirti ustida turadi,
    // ya'ni "Bekor qilish" o'zgarmaydi. Kontur spread'dan KEYIN: aks holda
    // pane'ning nozik chegarasi uni bosib ketardi.
    return [
      base,
      {
        ...glass.pane,
        borderWidth: 1,
        borderColor: variant === 'danger' ? colors.danger : colors.primary,
      },
    ];
  }, [colors, glass.pane, isDisabled, shadows.card, spacing.md, variant]);

  const textColor =
    variant === 'primary'
      ? colors.textOnPrimary
      : variant === 'danger'
        ? colors.danger
        : colors.primary;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => animateScale(0.95)}
      onPressOut={() => animateScale(1)}
      disabled={isDisabled}
      // Web'da <button> bo'lib chiqadi - ekran o'quvchi uni tugma deb
      // e'lon qiladi. Yuklanayotganda matn o'rnida aylana turadi, shuning
      // uchun nom label'da: aks holda tugma nomsiz qolardi.
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      // `style` OXIRIDA: chaqiruvchi fonni almashtira oladi (Gap "Oldim/
      // Berdim" ma'no ranglari, ConfirmDialog'dagi xavfli tasdiq).
      style={(state) => [getContainerStyle(state), style]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <Text style={[styles.text, typography.button, { color: textColor }]}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
  },
});

export default memo(Button);
