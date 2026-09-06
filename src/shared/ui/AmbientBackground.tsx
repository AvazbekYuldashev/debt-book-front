import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useAppTheme } from '../theme';

// ============================================================
//  Ilova "imzo" foni.
//
//  Nima uchun bunday yasalgan: loyihada `expo-linear-gradient` ham,
//  `react-native-svg` ham YO'Q (ikkalasi ham native modul — qo'shilsa EAS
//  build qayta kerak bo'ladi). Shuning uchun gradient ham, "blur" ham SOF
//  React Native View'lari bilan chiziladi:
//
//   * "blur" — bir markazdan chiqadigan bir necha konsentrik doira. Har
//     qavat alfasi juda past (~0.05); markazda ular qo'shilib quyuqroq,
//     chetga borgan sari susayadi => radial falloff = yumshoq nur dog'i.
//   * "gradient" — bir necha katta, ustma-ust tushgan translucent doira.
//     Chiziqli bantlar EMAS: bantlarda "banding" chizig'i ko'rinadi.
//
//  Qat'iy qoida: bu qatlam DEKORATIV. `pointerEvents="none"` — hech qachon
//  bosishni ushlamaydi; alfalar shunchalik pastki matn kontrastiga ta'sir
//  qilmaydi. Barcha shakl statik (re-render yo'q), faqat bir marta yumshoq
//  fade-in bo'ladi.
// ============================================================

interface BlobProps {
  size: number;
  color: string;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  /** Konsentrik qatlamlar soni — qancha ko'p bo'lsa, markaz shuncha quyuq. */
  layers?: number;
}

/** Yumshoq, chegarasiz nur dog'i (blur o'rnini bosuvchi konsentrik doiralar). */
const Blob = memo<BlobProps>(({ size, color, left, right, top, bottom, layers = 4 }) => (
  <View style={{ position: 'absolute', width: size, height: size, left, right, top, bottom }}>
    {Array.from({ length: layers }, (_, index) => {
      const diameter = size * (1 - index / (layers + 1));
      const offset = (size - diameter) / 2;
      return (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: offset,
            top: offset,
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: color,
          }}
        />
      );
    })}
  </View>
));
Blob.displayName = 'Blob';

interface LeafProps {
  size: number;
  color: string;
  rotate: string;
  left?: number;
  right?: number;
  top?: number;
}

/**
 * Botanik ishora: assimetrik radius (ikki qarama-qarshi burchak to'liq
 * yumaloq, qolgani o'tkir) barg siluetini beradi. Rasm ham, SVG ham kerak emas.
 */
const Leaf = memo<LeafProps>(({ size, color, rotate, left, right, top }) => (
  <View
    style={{
      position: 'absolute',
      left,
      right,
      top,
      width: size,
      height: size,
      borderTopLeftRadius: size,
      borderBottomRightRadius: size,
      borderTopRightRadius: size * 0.1,
      borderBottomLeftRadius: size * 0.1,
      backgroundColor: color,
      transform: [{ rotate }],
    }}
  />
));
Leaf.displayName = 'Leaf';

/**
 * Ekran ostidagi dekorativ qatlam. Ishlatilishi: kontentdan OLDIN, absolyut
 * to'ldirish sifatida qo'yiladi; ekran konteyneri fonini `transparent` qilish
 * kifoya.
 */
const AmbientBackground: React.FC = () => {
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;

  // Fon "birdaniga" paydo bo'lmasin — spetsifikatsiya bo'yicha yumshoq fade-in.
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [opacity]);

  // Shakllar o'lchami ekranga bog'liq — kichik (360px) va katta telefonlarda
  // kompozitsiya bir xil ko'rinadi.
  const layout = useMemo(
    () => ({
      topGreen: Math.round(width * 1.05),
      topBlue: Math.round(width * 0.9),
      sideBlue: Math.round(width * 0.75),
      bottomGreen: Math.round(width * 0.95),
      glow: Math.round(width * 0.8),
      wave: Math.round(width * 2),
      leaf: Math.round(width * 0.34),
    }),
    [width],
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.clip, { opacity }]}>
        {/* Yuqori qism: yengil yashil botanik zona. */}
        <Blob
          size={layout.topGreen}
          color={colors.ambientGreen}
          right={-Math.round(width * 0.45)}
          top={-Math.round(width * 0.5)}
        />
        <Leaf
          size={layout.leaf}
          color={colors.ambientGreen}
          rotate="-24deg"
          right={Math.round(width * 0.06)}
          top={Math.round(height * 0.02)}
        />
        <Leaf
          size={layout.leaf * 0.62}
          color={colors.ambientGreen}
          rotate="38deg"
          right={Math.round(width * 0.28)}
          top={-Math.round(height * 0.01)}
        />

        {/* Chap yuqori va o'ng o'rta: xira ko'k gradient dog'lari. */}
        <Blob
          size={layout.topBlue}
          color={colors.ambientBlue}
          left={-Math.round(width * 0.42)}
          top={-Math.round(width * 0.3)}
        />
        <Blob
          size={layout.sideBlue}
          color={colors.ambientBlue}
          right={-Math.round(width * 0.38)}
          top={Math.round(height * 0.34)}
          layers={3}
        />

        {/* Pastki qism: organik yashil-ko'k shakl va yumshoq yorug'lik. */}
        <Blob
          size={layout.bottomGreen}
          color={colors.ambientGreen}
          left={-Math.round(width * 0.4)}
          bottom={-Math.round(width * 0.34)}
        />
        <Blob
          size={layout.glow}
          color={colors.ambientGlow}
          left={Math.round(width * 0.1)}
          top={Math.round(height * 0.12)}
          layers={3}
        />

        {/* Eng pastda: juda katta doiraning yuqori yoyi — yumshoq to'lqin. */}
        <View
          style={{
            position: 'absolute',
            left: -(layout.wave - width) / 2,
            bottom: -Math.round(layout.wave * 0.82),
            width: layout.wave,
            height: layout.wave,
            borderRadius: layout.wave / 2,
            backgroundColor: colors.ambientTint,
            opacity: 0.5,
          }}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Shakllar ekran chetidan chiqib ketmasin (gorizontal overflow bo'lmasligi shart).
  clip: {
    overflow: 'hidden',
  },
});

export default memo(AmbientBackground);
