import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface EntranceViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Kechikish (ms) — ketma-ket (staggered) chiqish uchun. */
  delay?: number;
  /** Davomiylik (ms). Spetsifikatsiya: 180–350ms. */
  duration?: number;
  /** Pastdan siljish masofasi (px). 0 = faqat fade. */
  fromY?: number;
  /** Boshlang'ich masshtab (kartalar uchun 0.97 kabi juda yengil qiymat). */
  fromScale?: number;
}

/**
 * Ekranga kirish animatsiyasi: fade + yengil siljish (+ ixtiyoriy scale).
 * Bitta Animated.Value ustida interpolatsiya — barcha xossalar bitta
 * animatsiyadan chiqadi, shuning uchun native driver'da ishlaydi va
 * qayta render chaqirmaydi.
 *
 * `FadeInView` dan farqi: scale'ni ham qo'llab-quvvatlaydi va stagger uchun
 * mo'ljallangan (ro'yxat elementlari ketma-ket chiqadi).
 */
const EntranceView: React.FC<EntranceViewProps> = ({
  children,
  style,
  delay = 0,
  duration = 280,
  fromY = 12,
  fromScale = 1,
}) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, duration]);

  const animatedStyle = useMemo(
    () => ({
      opacity: progress,
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [fromScale, 1] }) },
      ],
    }),
    [progress, fromY, fromScale],
  );

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

export default memo(EntranceView);
