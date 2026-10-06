import { darkColors, lightColors, type ColorTokens } from './colors';
import { glassAlpha, type TransparencyLevel } from './transparency';

/**
 * Fon rasmi ustida matn O'QILADIMI - sirtlar shaffofligining qoidasi.
 *
 * Shaffoflik jadvallari (transparency.ts) shu hisob bilan tekshiriladi:
 * har darajada, har ikki mavzuda, HAR QANDAY rasmda (qop-qora ham, oppoq
 * ham) asosiy va kulrang matn o'qilishi shart. Shu sababli ilova mavzuni
 * hech qachon o'zi almashtirmaydi - yorug' rejim to'q fonda ham yorug'
 * qoladi (Samsung'dagidek), web va telefonda natija bir xil.
 *
 * Har katakka ko'z ko'radigan qatlamlar qo'yiladi: mavzu foni -> rasm ->
 * parda -> yuqori parda -> sirt.
 *
 * Bu sof funksiyalar: React'siz sinaladi.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Rasmning bitta katagi. `a` - katakni rasm qanchalik qoplaydi (PNG shaffofligi). */
export interface PhotoCell extends Rgb {
  a: number;
}

/** Ekranda ko'rinadigan rasm, qatorma-qator yuqoridan pastga. */
export interface PhotoSample {
  rows: number;
  cols: number;
  cells: PhotoCell[];
}

export type ThemeName = 'light' | 'dark';

/** Asosiy matn uchun kontrast - WCAG AA (oddiy matn). */
export const MIN_TEXT_CONTRAST = 4.5;

/**
 * Ikkinchi darajali (kulrang) matn uchun kontrast - WCAG ning eng past
 * chegarasi (3:1).
 *
 * NEGA ALOHIDA: asosiy matn o'qilsa ham kulrang yorliqlar - "Kam / O'rta
 * / Kuchli", "Moslash", telefon raqamlari - yarim shaffof sirtda 2.6
 * gacha tushib, ko'rinmay qolishi mumkin.
 */
export const MIN_SECONDARY_CONTRAST = 3;

/**
 * Yuqori parda: sarlavhalar to'g'ridan-to'g'ri rasm ustida turadi, shuning
 * uchun ekran tepasida mavzu rangli parda bor va pastga qarab so'nadi.
 * AmbientBackground shu qiymatlar bilan chizadi - hisob ham xuddi shunday.
 */
export const PHOTO_SCRIM_TOP = 0.88;
/** Parda qayerda tugaydi (ekran balandligiga nisbatan). */
export const PHOTO_SCRIM_END = 0.38;

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

/** Yuqori pardaning qalinligi ekran balandligining `y` (0..1) nuqtasida. */
export const scrimAt = (y: number): number =>
  y >= PHOTO_SCRIM_END ? 0 : PHOTO_SCRIM_TOP * (1 - y / PHOTO_SCRIM_END);

const PALETTES: Record<ThemeName, ColorTokens> = { light: lightColors, dark: darkColors };

const solid = (value: string): Rgb => {
  const parsed = parseColor(value);
  return parsed ? { r: parsed.r, g: parsed.g, b: parsed.b } : { r: 0, g: 0, b: 0 };
};

/**
 * Mavzu matni ekranning qancha qismida o'qiladi (0..1).
 *
 * Katak o'qiladi = asosiy VA kulrang matn ikkalasi ham o'qiladi.
 *
 * Har katakda matn ORTIDA ko'z ko'radigan rang yig'iladi: mavzu foni ->
 * rasm -> parda -> yuqori parda -> sirt. Parda, yuqori parda va sirt
 * rangi mavzudan, ya'ni bir xil rasm ikki mavzuda turlicha chiqadi:
 * yorug'da oqartiriladi, qorong'ida qoraytiriladi.
 */
export const readableShare = (
  sample: PhotoSample,
  theme: ThemeName,
  dim: number,
  level: TransparencyLevel,
): number => {
  if (sample.cells.length === 0) return 1;

  const palette = PALETTES[theme];
  const background = solid(palette.background);
  const tint = solid(palette.glassSurfaceOnPhoto);
  const text = solid(palette.textPrimary);
  const secondary = solid(palette.textSecondary);
  const { surface } = glassAlpha(level, true, theme === 'dark');

  let readable = 0;
  sample.cells.forEach((cell, index) => {
    const y = (Math.floor(index / sample.cols) + 0.5) / sample.rows;
    const photo = mix(cell, background, cell.a);
    const veiled = mix(background, photo, dim);
    const scrimmed = mix(background, veiled, scrimAt(y));
    const backdrop = mix(tint, scrimmed, surface);
    if (
      contrastRatio(text, backdrop) >= MIN_TEXT_CONTRAST &&
      contrastRatio(secondary, backdrop) >= MIN_SECONDARY_CONTRAST
    ) {
      readable += 1;
    }
  });
  return readable / sample.cells.length;
};
