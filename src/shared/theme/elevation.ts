import { Platform, type ViewStyle } from 'react-native';

// ============================================================
//  Soya (elevation) tokenlari — butun ilova uchun yagona manba.
//  Qoida: soya HECH QACHON qattiq bo'lmaydi. Asos — CSS'dagi
//  `0 6px 24px rgba(30, 50, 80, 0.08)` ta'siri.
//  Ranglar mavzudan keladi (light: ko'kimtir navy, dark: qora).
// ============================================================

/**
 * Android'da `elevation` SHAFFOF sirtlarga berilmaydi.
 *
 * NIMA UCHUN: Android soyani View'ning konturi bo'yicha chizadi, lekin fon
 * yarim shaffof bo'lsa kontur aniqlanmaydi va soya TO'RTBURCHAK chegara
 * bo'yicha chiziladi. Natijada yumaloq kartaning ICHIDA o'tkir burchakli
 * ochroq to'rtburchak paydo bo'lardi, pastki panel ostida esa oq chiziq —
 * ekranlar "oq bloklar"ga to'lib ketgandek ko'rinardi.
 *
 * iOS'da `shadow*` xossalari shaffof fon bilan ham to'g'ri ishlaydi,
 * shuning uchun ular o'z holida qoladi. Android'da soya o'rniga shisha
 * sirtning o'z shaffofligi va nozik chegarasi ajratib turadi.
 *
 * QATTIQ fonli sirtlarga (FAB) elevation baribir beriladi — u yerda kontur
 * aniq va soya to'g'ri chiziladi.
 */
const glassElevation = (value: number): number => (Platform.OS === 'android' ? 0 : value);

export interface ShadowTokens {
  /** Odatiy karta/sirt: deyarli sezilmas, lekin fon ustidan ajratadi. */
  card: ViewStyle;
  /** Ko'tarilgan sirt (asosiy summary karta, modal sarlavhalari). */
  raised: ViewStyle;
  /** Suzuvchi tugma — rangli, biroz kuchliroq. */
  floating: ViewStyle;
  /** Pastki navigatsiya — soya YUQORIGA tushadi. */
  nav: ViewStyle;
}

export const makeShadows = (shadowColor: string): ShadowTokens => ({
  card: {
    shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: glassElevation(3),
  },
  raised: {
    shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: glassElevation(5),
  },
  // FAB foni QATTIQ (primary) — kontur aniq, soya to'g'ri chiziladi.
  floating: {
    shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  nav: {
    shadowColor,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: glassElevation(12),
  },
});
