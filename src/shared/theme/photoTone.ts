import { darkColors, lightColors, type ColorTokens } from './colors';
import {
  FROST_BRIGHTNESS,
  FROST_HAZE,
  FROST_SATURATE,
  TRANSPARENCY_LEVELS,
  glassAlpha,
  withHaze,
  type PhotoFloors,
  type TransparencyLevel,
} from './transparency';

/**
 * Fon rasmi ustidagi matn: qaysi rangda va o'qiladimi.
 *
 * 1. MATN RANGI FONGA ERGASHADI (photoTheme): yorug' rejimda fon rasmi
 *    to'q bo'lsa, yozuvlar OQ chiqadi (sirtlar to'q muzli shisha) - va
 *    aksincha. Foydalanuvchi talabi: to'q fonda to'q yozuv bo'lmasin.
 *
 * 2. O'QILISH QOIDASI (readableShare): shaffoflik jadvallari
 *    (transparency.ts) shu hisob bilan tekshiriladi - har darajada, har
 *    ikki mavzuda, HAR QANDAY rasmda asosiy va kulrang matn o'qilishi
 *    shart. Shu sababli rasmni o'lchab bo'lmaganda ham (telefon) matn
 *    baribir o'qiladi, faqat rangi mavzudan qoladi.
 *
 * Har katakka ko'z ko'radigan qatlamlar qo'yiladi: mavzu foni -> rasm ->
 * muzlatish -> sirt.
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

/**
 * Rasm ustidagi palitra - ThemeProvider aynan shunday beradi: kulrang matn
 * rasm ustidagi varianti (textSecondaryOnPhoto). Ilova rangi - standart.
 */
const PHOTO_PALETTES: Record<ThemeName, ColorTokens> = {
  light: { ...lightColors, textSecondary: lightColors.textSecondaryOnPhoto },
  dark: { ...darkColors, textSecondary: darkColors.textSecondaryOnPhoto },
};

const solid = (value: string): Rgb => {
  const parsed = parseColor(value);
  return parsed ? { r: parsed.r, g: parsed.g, b: parsed.b } : { r: 0, g: 0, b: 0 };
};

const clamp255 = (value: number) => Math.min(255, Math.max(0, value));

/**
 * Muzlatish rasm rangiga nima qiladi - CSS `saturate()` va `brightness()`
 * aynan shunday hisoblaydi (Filter Effects matritsasi, sRGB qiymatlarda,
 * har bosqichdan keyin 0..255 ga qirqiladi).
 *
 * Blur bu yerda yo'q: u rangni emas, DETALni yo'qotadi - kataklar
 * allaqachon o'rtacha rang.
 */
const frostColor = ({ r, g, b }: Rgb, theme: ThemeName): Rgb => {
  const s = FROST_SATURATE;
  const k = FROST_BRIGHTNESS[theme];
  const sr = clamp255((0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b);
  const sg = clamp255((0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b);
  const sb = clamp255((0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b);
  return { r: clamp255(sr * k), g: clamp255(sg * k), b: clamp255(sb * k) };
};

/**
 * Mavzu matni ekranning qancha qismida o'qiladi (0..1).
 *
 * Katak o'qiladi = asosiy VA kulrang matn ikkalasi ham o'qiladi. Kulrang
 * - rasm ustidagi varianti (textSecondaryOnPhoto): ekranda aynan u turadi.
 *
 * Har katakda matn ORTIDA ko'z ko'radigan rang: mavzu foni -> rasm ->
 * muzlatish (faqat web) -> sirt tusi + oq xiralik. Sirt rangini glass.ts
 * bilan BIR XIL funksiya (withHaze) yasaydi. Muzlatishning blur'i hisobga
 * olinmaydi (faqat detalni yo'qotadi), rangga ta'siri esa olinadi.
 */
export const readableShare = (
  sample: PhotoSample,
  theme: ThemeName,
  level: TransparencyLevel,
  /** Sirt ortini muzlata oladimi (web: ha, telefon: yo'q - glassAlpha). */
  frosted = true,
  {
    floors,
    palette = PHOTO_PALETTES[theme],
    colored = false,
  }: {
    /** O'lchangan rasm chegaralari (photoFloor) - ekranda shular bilan chiziladi. */
    floors?: PhotoFloors;
    /** Yakuniy palitra (ilova rangi bilan). Standart - mavzu + rasm ustidagi kulrang. */
    palette?: FloorPalette;
    /** Rangli matn (summalar, xavf, ilova rangi) ham 3:1 bo'lsinmi. */
    colored?: boolean;
  } = {},
): number => {
  if (sample.cells.length === 0) return 1;

  const background = solid(palette.background);
  const texts: [Rgb, number][] = [
    [solid(palette.textPrimary), MIN_TEXT_CONTRAST],
    [solid(palette.textSecondary), MIN_SECONDARY_CONTRAST],
    ...(colored
      ? [palette.negative, palette.positive, palette.danger, palette.primary].map(
          (color) => [solid(color), MIN_SECONDARY_CONTRAST] as [Rgb, number],
        )
      : []),
  ];
  const { surface } = glassAlpha(level, true, theme === 'dark', frosted, floors);
  // To'liq yopiq sirt ortini ko'rsatmaydi - u yerda muzlatish ham yo'q (glass.ts).
  const frost = frosted && surface < 1;
  const layer = parseColor(withHaze(palette.glassSurfaceOnPhoto, surface, frost ? FROST_HAZE[theme] : 0));
  const tint = layer ? { r: layer.r, g: layer.g, b: layer.b } : solid(palette.glassSurfaceOnPhoto);
  const tintAlpha = layer ? layer.a : surface;

  let readable = 0;
  sample.cells.forEach((cell) => {
    const photo = mix(cell, background, cell.a);
    const behind = frost ? frostColor(photo, theme) : photo;
    const backdrop = mix(tint, behind, tintAlpha);
    if (texts.every(([color, min]) => contrastRatio(color, backdrop) >= min)) readable += 1;
  });
  return readable / sample.cells.length;
};

/**
 * Sirt tusi qancha bo'lsa, ustidagi matn rasmning SHU qismida o'qiladi
 * (0..1, 0.02 qadam). Model readableShare bilan bir xil: muzlatilgan rasm
 * -> oq xiralik -> tus (withHaze).
 */
const FLOOR_STEP = 0.02;
const requiredAlpha = (
  photo: Rgb,
  palette: FloorPalette,
  theme: ThemeName,
  texts: [Rgb, number][],
): number => {
  const tintColor = palette.glassSurfaceOnPhoto;
  const frosted = frostColor(photo, theme);
  for (let step = 0; step <= 1 / FLOOR_STEP; step += 1) {
    const alpha = Math.min(1, step * FLOOR_STEP);
    const open = alpha < 1;
    const layer = parseColor(withHaze(tintColor, alpha, open ? FROST_HAZE[theme] : 0));
    if (!layer) return 1;
    const backdrop = mix(layer, open ? frosted : photo, layer.a);
    if (texts.every(([color, min]) => contrastRatio(color, backdrop) >= min)) return alpha;
  }
  return 1;
};

/** photoFloor uchun kerakli ranglar - ThemeProvider'ning YAKUNIY palitrasi. */
export type FloorPalette = Pick<
  ColorTokens,
  | 'background'
  | 'glassSurfaceOnPhoto'
  | 'textPrimary'
  | 'textSecondary'
  | 'negative'
  | 'positive'
  | 'danger'
  | 'primary'
>;

/** Shaffoflik chegarasi: shu ulushdagi kataklar o'qilishi shart. */
const FLOOR_SHARE = 0.95;

/**
 * Shu fon RASMI ustida sirt eng kamida qancha tusli bo'lishi kerak.
 *
 * Ko'rinish (oq yoki to'q yozuv) rasmning kontent qismiga qarab tanlanadi,
 * lekin sarlavha, summa kartasi va boshqa sirtlar BUTUN ekranda turadi:
 * tepasi och osmon, pasti to'q yer bo'lgan rasmda oq yozuv osmon ustida
 * o'qilmay qolardi. Shuning uchun BUTUN rasm tekshiriladi va kataklarning
 * 95% ida matn o'qiladigan eng kichik tus olinadi (bitta yorqin dog' -
 * chiroq, oy - butun ilovani yopib qo'ymasin).
 *
 * Ikki chegara:
 *   text    - asosiy (4.5:1) va kulrang (3:1) matn. "Ko'p" faqat shuni
 *             kafolatlaydi: foydalanuvchi eng ko'p shaffoflikni tanlagan.
 *   colored - + qizil/yashil summalar, xavf rangi va ilova rangi (3:1).
 *             "Kam" va "O'rta" (standart) da summalar ham doim o'qiladi.
 *
 * Ko'p rasmlarda (to'q, och, bir tusli) ikkalasi 0 - sirt jadvaldagidek
 * shaffof qoladi.
 */
export const photoFloor = (
  sample: PhotoSample,
  palette: FloorPalette,
  theme: ThemeName,
): PhotoFloors => {
  if (sample.cells.length === 0) return { text: 0, colored: 0 };
  const background = solid(palette.background);
  const text: [Rgb, number][] = [
    [solid(palette.textPrimary), MIN_TEXT_CONTRAST],
    [solid(palette.textSecondary), MIN_SECONDARY_CONTRAST],
  ];
  const colored: [Rgb, number][] = [
    ...text,
    ...[palette.negative, palette.positive, palette.danger, palette.primary].map(
      (color) => [solid(color), MIN_SECONDARY_CONTRAST] as [Rgb, number],
    ),
  ];
  const textNeed: number[] = [];
  const coloredNeed: number[] = [];
  sample.cells.forEach((cell) => {
    const photo = mix(cell, background, cell.a);
    const own = requiredAlpha(photo, palette, theme, text);
    textNeed.push(own);
    coloredNeed.push(Math.max(own, requiredAlpha(photo, palette, theme, colored)));
  });
  const quantile = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.ceil(FLOOR_SHARE * sorted.length) - 1)];
  };
  return { text: quantile(textNeed), colored: quantile(coloredNeed) };
};

