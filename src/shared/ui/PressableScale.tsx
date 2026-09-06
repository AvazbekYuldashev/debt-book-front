import React, { memo, useCallback, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// Web'da native driver yo'q — transform JS thread'da animatsiya qilinadi.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Bosilgandagi masshtab (1 dan kichik). */
  scaleTo?: number;
}

/**
 * Taktil javob beruvchi bosiladigan konteyner: bosilganda juda yengil
 * kichrayadi, qo'yib yuborilganda "spring" bilan qaytadi. Animatsiya
 * native driver'da ketadi — 60 FPS, JS thread'ni band qilmaydi va
 * qayta render CHAQIRMAYDI (Animated.Value React state emas).
 */
const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  scaleTo = 0.96,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      Animated.timing(scale, {
        toValue: scaleTo,
        duration: 110,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
      onPressIn?.(event);
    },
    [scale, scaleTo, onPressIn],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
      onPressOut?.(event);
    },
    [scale, onPressOut],
  );

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable style={style} onPressIn={handlePressIn} onPressOut={handlePressOut} {...rest}>
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default memo(PressableScale);
