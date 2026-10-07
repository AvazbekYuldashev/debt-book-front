/**
 * Rang matematikasi: satrni rangga aylantirish, qatlamlarni aralashtirish
 * va WCAG kontrasti.
 *
 * NEGA ALOHIDA: bular shisha sirtlarining o'qilishini TEKSHIRADI. Ilgari
 * ular `photoTone.ts` ichida, fon rasmini o'lchash mantig'i bilan birga
 * turardi; o'sha mantiq olib tashlangach (rasm endi shishaga ta'sir
 * qilmaydi) sof hisob qoldi.
 *
 * React'siz, mavzusiz - faqat son.
 */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

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

/** Asosiy matn uchun eng kam kontrast (WCAG AA). */
export const MIN_TEXT_CONTRAST = 4.5;
/** Kulrang/ikkinchi darajali matn uchun eng kam kontrast (WCAG AA large). */
export const MIN_SECONDARY_CONTRAST = 3;
