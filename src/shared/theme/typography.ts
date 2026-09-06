import { TextStyle } from 'react-native';
import { fontFamily } from './fonts';

export interface TypographyTokens {
  /** Ekran sarlavhasi (page title). Telefon ekranida sarlavha bloki
   *  ro'yxatdan joy o'g'irlamasligi kerak — shuning uchun 26px. */
  display: TextStyle;
  heading1: TextStyle;
  heading2: TextStyle;
  /** Bo'lim (section) sarlavhasi — 22px, qalin. */
  heading3: TextStyle;
  /** Asosiy summa (balans kartasi) — katta, tabular raqamlar. */
  amount: TextStyle;
  body: TextStyle;
  bodySmall: TextStyle;
  label: TextStyle;
  button: TextStyle;
  caption: TextStyle;
}

export const typography: TypographyTokens = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heading1: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  heading2: {
    fontFamily: fontFamily.semiBold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  heading3: {
    fontFamily: fontFamily.bold,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  amount: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
};
