import { darkColors, lightColors, type ColorTokens } from './colors';
import { glassAlpha, type TransparencyLevel } from './transparency';

/**
 * Fon rasmi ustida qaysi mavzuning matni O'QILADI.
 *
 * MUAMMO: "Ko'p" shaffoflikda sirt deyarli yo'q (alfa 0.08) va matn
 * to'g'ridan-to'g'ri rasm ustida turadi. Yorug' mavzuda matn to'q - to'q
 * rasm ustida u butunlay yo'qolardi. Sirtni qalinlashtirish yechim emas:
 * oq qatlam to'q rasmni sut rangli tumanga aylantiradi (bu allaqachon
 * sinab ko'rilgan va rad etilgan).
 *
 * YECHIM: shaffof sirtda matn rangi mavzudan emas, RASMDAN kelishi kerak.
 * Rasmning o'rtacha rangi o'lchanadi, ustiga ko'z ko'radigan qatlamlar
 * (parda va sirt) qo'yiladi va matn kontrasti hisoblanadi. Tanlangan
 * mavzu o'qilsa - u QOLADI. O'qilmasa, matni yaxshiroq o'qiladigan
 * mavzuga o'tiladi.
 *
 * Bu sof funksiyalar: React'siz sinaladi.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export type ThemeName = 'light' | 'dark';

/**
 * Tanlangan mavzu shu kontrastdan past bo'lmasa saqlanadi.
 *
 * WCAG AA (oddiy matn uchun 4.5). Pastroq chegara (masalan 3) yetmaydi:
 * u asosiy matnni o'lchaydi, ikkinchi darajali matn esa undan ancha
 * och va o'sha chegarada o'qilmay qolardi.
 */
export const KEEP_THEME_CONTRAST = 4.5;

const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGBA = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

/** `#RRGGBB` yoki `rgb(a)(...)` satrini rangga aylantiradi. */
export const parseColor = (value: string): (Rgb & { a: number }) | null => {
  const hex = HEX.exec(value.trim());
  if (hex) {
    return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16), a: 1 };
  }
  const rgba = RGBA.exec(value.trim());
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }
  return null;
};

/** `top` ni `alpha` qalinlikda `bottom` ustiga qo'yadi - ekran shunday aralashtiradi. */
export const mix = (top: Rgb, bottom: Rgb, alpha: number): Rgb => ({
  r: top.r * alpha + bottom.r * (1 - alpha),
  g: top.g * alpha + bottom.g * (1 - alpha),
  b: top.b * alpha + bottom.b * (1 - alpha),
});

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG nisbiy yorqinligi, 0..1. */
export const luminance = ({ r, g, b }: Rgb): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** WCAG kontrast nisbati, 1..21. */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const PALETTES: Record<ThemeName, ColorTokens> = { light: lightColors, dark: darkColors };

const solid = (value: string): Rgb => {
  const parsed = parseColor(value);
  return parsed ? { r: parsed.r, g: parsed.g, b: parsed.b } : { r: 0, g: 0, b: 0 };
};

/**
 * Matn ORTIDA ko'z ko'radigan rang: rasm -> parda -> sirt.
 *
 * Parda va sirt rangi mavzudan, ya'ni bir xil rasm ikki mavzuda turlicha
 * chiqadi: yorug'da oqartiriladi, qorong'ida qoraytiriladi.
 */
export const backdropOnPhoto = (
  photo: Rgb,
  theme: ThemeName,
  dim: number,
  level: TransparencyLevel,
): Rgb => {
  const palette = PALETTES[theme];
  const veiled = mix(solid(palette.background), photo, dim);
  const { surface } = glassAlpha(level, true, theme === 'dark');
  return mix(solid(palette.glassSurfaceOnPhoto), veiled, surface);
};

/** Mavzu matnining rasm ustidagi kontrasti. */
export const textContrastOnPhoto = (
  photo: Rgb,
  theme: ThemeName,
  dim: number,
  level: TransparencyLevel,
): number =>
  contrastRatio(solid(PALETTES[theme].textPrimary), backdropOnPhoto(photo, theme, dim, level));

/**
 * Rasm ustida qaysi mavzu ko'rsatiladi.
 *
 * Foydalanuvchi tanlovi USTUN: uning mavzusi o'qilsa, o'zgarmaydi. Faqat
 * matn o'qilmay qolganda, va boshqa mavzu haqiqatan yaxshiroq bo'lsagina,
 * almashtiriladi - aks holda tanlovni bekorga buzgan bo'lardik.
 *
 * Amalda bu deyarli faqat "Ko'p" shaffoflikda ishlaydi: "O'rta" va "Kam"
 * da sirt o'zi matnga yetarli fon beradi.
 */
export const readableTheme = (
  preferred: ThemeName,
  photo: Rgb,
  dim: number,
  level: TransparencyLevel,
): ThemeName => {
  const own = textContrastOnPhoto(photo, preferred, dim, level);
  if (own >= KEEP_THEME_CONTRAST) return preferred;

  const other: ThemeName = preferred === 'dark' ? 'light' : 'dark';
  return textContrastOnPhoto(photo, other, dim, level) > own ? other : preferred;
};
