import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, type LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useAppTheme } from '../theme';

// ============================================================
//  Ilova "imzo" foni: yengil ko'k-yashil gradient, yumshoq tepaliklar
//  va xira botanik shakllar (barglar, novdalar).
//
//  Qat'iy qoida: bu qatlam DEKORATIV. `pointerEvents="none"` — hech qachon
//  bosishni ushlamaydi. Barcha shakl opacity 0.08–0.20 oralig'ida —
//  ko'zga tashlanadi, lekin ustidagi matn kontrastiga ta'sir qilmaydi
//  (kontent oq kartalar ustida, fon esa faqat ular ORASIDA ko'rinadi).
//  Shakllar STATIK (qayta render bo'lmaydi), faqat bir marta yumshoq
//  fade-in bo'ladi.
//
//  Koordinatalar eni 390 birlik bo'lgan "dizayn maydoni"da yoziladi;
//  balandlik konteyner nisbatiga qarab hisoblanadi. Shu sababli barglar
//  hech qachon cho'zilmaydi va chetlaridan qirqilmaydi — tor telefonda ham,
//  keng brauzer ustunida ham kompozitsiya butun ko'rinadi.
// ============================================================

// Dizayn maydonining ENI. Bo'yi konteyner nisbatidan hisoblanadi (H).
const VB_W = 390;

interface LeafProps {
  /** Barg uchining koordinatasi (novda boshlanadigan nuqta). */
  x: number;
  y: number;
  /** Barg uzunligi (dizayn birligida). */
  length: number;
  /** Burilish burchagi, gradus. */
  rotate: number;
  color: string;
  opacity: number;
  /** Bargning "semizligi" — uzunlikka nisbatan eni. */
  fatness?: number;
}

/**
 * Bitta barg: ikki tomoni ham uchli bodom shakli + o'rta tomir.
 *
 * Ikki kvadratik egri bir-biriga qarama-qarshi qo'yilgan: (0,0) dan (L,0)
 * gacha yuqoridan, keyin pastdan qaytadi. Aynan shu ikki egri chiziq
 * tufayli shakl "doira" emas, HAQIQIY barg konturiga o'xshaydi — sof
 * View'lar (border-radius) bilan buni chiqarib bo'lmasdi.
 */
const Leaf = memo<LeafProps>(({ x, y, length, rotate, color, opacity, fatness = 0.3 }) => {
  const w = length * fatness;
  const d = `M 0 0 Q ${length * 0.45} ${-w}, ${length} 0 Q ${length * 0.45} ${w}, 0 0 Z`;
  return (
    <G transform={`translate(${x}, ${y}) rotate(${rotate})`}>
      <Path d={d} fill={color} opacity={opacity} />
      {/* O'rta tomir — bargni "yassi dog'" bo'lishdan saqlaydi. */}
      <Path
        d={`M ${length * 0.06} 0 L ${length * 0.9} 0`}
        stroke={color}
        strokeWidth={length * 0.02}
        opacity={opacity * 0.9}
      />
    </G>
  );
});
Leaf.displayName = 'Leaf';

interface SprigProps {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  color: string;
  opacity: number;
}

/** Novda: egri poya va uning bo'ylab navbatma-navbat joylashgan barglar. */
const Sprig = memo<SprigProps>(({ x, y, rotate, scale, color, opacity }) => (
  <G transform={`translate(${x}, ${y}) rotate(${rotate}) scale(${scale})`}>
    <Path
      d="M 0 0 Q 40 -30, 96 -44"
      stroke={color}
      strokeWidth={2}
      fill="none"
      opacity={opacity * 0.8}
    />
    <Leaf x={12} y={-8} length={46} rotate={-62} color={color} opacity={opacity} />
    <Leaf x={20} y={-12} length={42} rotate={26} color={color} opacity={opacity * 0.85} />
    <Leaf x={44} y={-24} length={52} rotate={-48} color={color} opacity={opacity} />
    <Leaf x={52} y={-28} length={44} rotate={34} color={color} opacity={opacity * 0.85} />
    <Leaf x={78} y={-38} length={48} rotate={-28} color={color} opacity={opacity} />
    <Leaf x={92} y={-43} length={34} rotate={16} color={color} opacity={opacity * 0.8} />
  </G>
));
Sprig.displayName = 'Sprig';

/**
 * Ekran ostidagi dekorativ qatlam. Ishlatilishi: kontentdan OLDIN, absolyut
 * to'ldirish sifatida qo'yiladi; ekran konteyneri fonini `transparent`
 * qilish kifoya.
 */
const AmbientBackground: React.FC = () => {
  const { colors, activeTheme } = useAppTheme();
  const fade = useRef(new Animated.Value(0)).current;

  // O'lcham KONTEYNERdan olinadi, oyna o'lchamidan EMAS.
  //
  // Ilgari `useWindowDimensions()` ishlatilgandi va web'da fon buzilardi:
  // ilova `AppFrame` ichida tor ustunga siqiladi, oyna esa ancha keng —
  // SVG konteynerdan bir necha barobar kattaroq chizilib, kompozitsiyaning
  // faqat bo'sh o'rta qismi ko'rinardi, barglar ekrandan tashqarida qolardi.
  const [size, setSize] = useState({ width: 0, height: 0 });
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  // Fon "birdaniga" paydo bo'lmasin — yumshoq fade-in.
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fade]);

  const isDark = activeTheme === 'dark';
  // Qorong'i mavzuda bir xil alfa ancha ko'zga tashlanadi (fon qora bo'lgani
  // uchun har qanday yorug'lik ajralib turadi) — shuning uchun butun qatlam
  // susaytiriladi.
  const k = isDark ? 0.55 : 1;

  const green = colors.primary;
  const blue = colors.info;
  const glow = isDark ? colors.info : '#FFFFFF';

  // viewBox balandligi konteyner NISBATIGA moslanadi: eni doim 390 dizayn
  // birligi, bo'yi esa shunga proporsional. Shu sababli `slice` kerak emas —
  // kompozitsiya na cho'ziladi, na chetlaridan qirqiladi. Pastki elementlar
  // `H` ga nisbatan joylashtiriladi, ya'ni ular DOIM ekran ostida qoladi.
  const H = Math.round((VB_W * size.height) / Math.max(size.width, 1));

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
      pointerEvents="none"
      onLayout={handleLayout}
    >
      {size.width === 0 ? null : (
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Svg
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${VB_W} ${H}`}
        >
          <Defs>
            {/* Yuqoridan pastga yengil ko'k-yashil yuvindi. */}
            <LinearGradient id="wash" x1="0" y1="0" x2="0.35" y2="1">
              <Stop offset="0" stopColor={blue} stopOpacity={0.16 * k} />
              <Stop offset="0.45" stopColor={green} stopOpacity={0.09 * k} />
              <Stop offset="1" stopColor={green} stopOpacity={0.05 * k} />
            </LinearGradient>
            {/* Yumshoq nur dog'i — chekkasi sezilmay yo'qoladi. */}
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={glow} stopOpacity={isDark ? 0.06 : 0.85} />
              <Stop offset="1" stopColor={glow} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="leafGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={green} stopOpacity={0.16 * k} />
              <Stop offset="1" stopColor={green} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          <Rect x={0} y={0} width={VB_W} height={H} fill="url(#wash)" />

          {/* --- Yuqori qism: yumshoq tepalik siluetlari --- */}
          <Path
            d={`M 0 118 Q 74 46, 168 96 Q 250 140, 320 78 Q 358 44, ${VB_W} 66 L ${VB_W} 0 L 0 0 Z`}
            fill={green}
            opacity={0.10 * k}
          />
          <Path
            d={`M 0 74 Q 96 128, 196 66 Q 284 12, ${VB_W} 40 L ${VB_W} 0 L 0 0 Z`}
            fill={blue}
            opacity={0.09 * k}
          />

          {/* --- O'ng yuqori: o'simlik novdasi (maketdagi bargli burchak) --- */}
          <Circle cx={352} cy={104} r={128} fill="url(#leafGlow)" />
          <Sprig x={330} y={168} rotate={-104} scale={1.15} color={green} opacity={0.20 * k} />
          <Sprig x={378} y={126} rotate={-58} scale={0.85} color={green} opacity={0.17 * k} />
          <Leaf x={300} y={40} length={92} rotate={38} color={green} opacity={0.16 * k} fatness={0.26} />

          {/* --- Chap chekka: yakka barglar (balandlikning ~30% i) --- */}
          <Leaf x={-26} y={H * 0.3} length={104} rotate={22} color={green} opacity={0.16 * k} fatness={0.27} />
          <Leaf x={-18} y={H * 0.35} length={78} rotate={-14} color={green} opacity={0.14 * k} />
          <Circle cx={10} cy={H * 0.355} r={116} fill="url(#leafGlow)" />

          {/* --- O'rta: juda xira yorug'lik dog'lari (chuqurlik hissi) --- */}
          <Ellipse cx={92} cy={H * 0.46} rx={168} ry={132} fill="url(#glow)" />
          <Ellipse cx={330} cy={H * 0.66} rx={150} ry={140} fill="url(#glow)" />

          {/* --- Pastki qism: organik to'lqin va bargli burchak --- */}
          <Path
            d={`M 0 ${H - 138} Q 108 ${H - 198}, 214 ${H - 142} Q 306 ${H - 94}, ${VB_W} ${H - 154} L ${VB_W} ${H} L 0 ${H} Z`}
            fill={blue}
            opacity={0.08 * k}
          />
          <Path
            d={`M 0 ${H - 62} Q 124 ${H - 118}, 240 ${H - 68} Q 322 ${H - 32}, ${VB_W} ${H - 80} L ${VB_W} ${H} L 0 ${H} Z`}
            fill={green}
            opacity={0.10 * k}
          />
          <Circle cx={44} cy={H - 38} r={140} fill="url(#leafGlow)" />
          <Sprig x={-10} y={H - 16} rotate={-46} scale={1.05} color={green} opacity={0.17 * k} />
          <Leaf x={286} y={H - 20} length={96} rotate={-118} color={green} opacity={0.16 * k} fatness={0.26} />
          <Leaf x={334} y={H - 12} length={72} rotate={-74} color={green} opacity={0.14 * k} />
        </Svg>
      </Animated.View>
      )}
    </View>
  );
};

export default memo(AmbientBackground);
