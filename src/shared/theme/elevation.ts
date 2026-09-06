import type { ViewStyle } from 'react-native';

// ============================================================
//  Soya (elevation) tokenlari — butun ilova uchun yagona manba.
//  Qoida: soya HECH QACHON qattiq bo'lmaydi. Asos — CSS'dagi
//  `0 6px 24px rgba(30, 50, 80, 0.08)` ta'siri.
//  Ranglar mavzudan keladi (light: ko'kimtir navy, dark: qora).
// ============================================================

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
    elevation: 3,
  },
  raised: {
    shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 5,
  },
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
    elevation: 12,
  },
});
