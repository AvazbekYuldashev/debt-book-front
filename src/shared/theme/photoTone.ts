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
 * Rasm ekranda ko'rinadigan holida kataklarga bo'lib o'lchanadi, har
 * katakka ko'z ko'radigan qatlamlar (parda, yuqori parda, sirt) qo'yiladi
 * va matn qayerda o'qilishi sanaladi.
 *
 * NEGA O'RTACHA RANG EMAS: yuqorisi och, pasti to'q rasmning o'rtachasi
 * "o'rtacha" chiqadi va yorug' mavzu o'tib ketardi - ro'yxat esa aynan
 * to'q pastki qismda turadi va u yerda kontrast 2.7 edi.
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

/** Katakda matn o'qiladi deyilishi uchun kontrast - WCAG AA (oddiy matn). */
export const MIN_TEXT_CONTRAST = 4.5;

/**
 * Tanlangan mavzu ekranning shuncha qismida o'qilsa - saqlanadi.
 *
 * To'liq (1.0) talab qilinmaydi: rasmda doim bir-ikki keskin dog' bo'ladi
 * va ular uchun foydalanuvchi tanlovini buzish noto'g'ri bo'lardi.
 */
export const KEEP_THEME_SHARE = 0.8;

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
  const { surface } = glassAlpha(level, true, theme === 'dark');

  let readable = 0;
  sample.cells.forEach((cell, index) => {
    const y = (Math.floor(index / sample.cols) + 0.5) / sample.rows;
    const photo = mix(cell, background, cell.a);
    const veiled = mix(background, photo, dim);
    const scrimmed = mix(background, veiled, scrimAt(y));
    const backdrop = mix(tint, scrimmed, surface);
    if (contrastRatio(text, backdrop) >= MIN_TEXT_CONTRAST) readable += 1;
  });
  return readable / sample.cells.length;
};

/**
 * Rasm ustida qaysi mavzu ko'rsatiladi.
 *
 * Foydalanuvchi tanlovi USTUN: uning mavzusi ekranning katta qismida
 * o'qilsa, o'zgarmaydi. Faqat o'qilmasa, va boshqa mavzu haqiqatan ko'proq
 * joyda o'qilsagina, almashtiriladi - aks holda tanlovni bekorga buzgan
 * bo'lardik.
 *
 * Amalda bu deyarli faqat "Ko'p" shaffoflikda ishlaydi: "O'rta" va "Kam"
 * da sirt o'zi matnga yetarli fon beradi.
 */
export const readableTheme = (
  preferred: ThemeName,
  sample: PhotoSample,
  dim: number,
  level: TransparencyLevel,
): ThemeName => {
  const own = readableShare(sample, preferred, dim, level);
  if (own >= KEEP_THEME_SHARE) return preferred;

  const other: ThemeName = preferred === 'dark' ? 'light' : 'dark';
  return readableShare(sample, other, dim, level) > own ? other : preferred;
};
