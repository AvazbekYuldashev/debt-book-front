import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

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
 *
 * Web'da animatsiya tugagach opacity/transform butunlay OLIB TASHLANADI.
 * Ular qolsa (opacity 1, identity transform) ham ko'zga hech narsa
 * o'zgarmaydi, lekin Chromium shu element ichidagi scroller'dagi
 * `backdrop-filter` ni animatsiyadan keyin qayta hisoblamaydi: mijoz
 * sahifasidagi tarix kartasi (ContactDetail, glass.pane) fon rasmi
 * ustida muzlamay, rasm qumi va yoriqlari matn ortida keskin qolardi -
 * qarzlar ro'yxati esa EntranceView'siz bo'lgani uchun muzli edi.
 * Native'da bu muammo yo'q va u yer o'zgarmaydi.
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
  // Platforma render paytida o'qiladi (modul yuklanganda emas) - testlar
  // web yo'lini ham tekshira olsin.
  const isWeb = Platform.OS === 'web';
  const [done, setDone] = useState(false);

  useEffect(() => {
    // stop() ham callback'ni (finished: false) chaqiradi; unmount yoki
    // qayta ishga tushishdan keyin state yozilmasin.
    let alive = true;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: !isWeb,
    });
    animation.start(({ finished }) => {
      if (alive && finished && isWeb) setDone(true);
    });
    return () => {
      alive = false;
      animation.stop();
    };
  }, [progress, delay, duration, isWeb]);

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

  // Element turi o'sha-o'sha (Animated.View): faqat style almashadi, bolalar
  // qayta mount bo'lmaydi - ro'yxat scroll holati va fokus saqlanadi.
  if (done) return <Animated.View style={style}>{children}</Animated.View>;
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

export default memo(EntranceView);
