import { darkColors, lightColors, type ColorTokens } from './colors';
import { FROST_BRIGHTNESS, FROST_SATURATE, glassAlpha, type TransparencyLevel } from './transparency';

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

/**
 * Kontent (kartalar, ro'yxat) qayerdan boshlanadi - ekran balandligiga
 * nisbatan. Tepada sarlavhalar turadi va ular o'z sirtida; matn rangi
 * esa kontent turgan joydagi rasmga mos bo'lishi kerak.
 */
export const CONTENT_TOP = 0.38;

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
 * muzlatish (faqat web) -> sirt tusi. Muzlatishning blur'i hisobga
 * olinmaydi (faqat detalni yo'qotadi), rangga ta'siri esa olinadi.
 */
export const readableShare = (
  sample: PhotoSample,
  theme: ThemeName,
  level: TransparencyLevel,
  /** Sirt ortini muzlata oladimi (web: ha, telefon: yo'q - glassAlpha). */
  frosted = true,
): number => {
  if (sample.cells.length === 0) return 1;

  const palette = PALETTES[theme];
  const background = solid(palette.background);
  const tint = solid(palette.glassSurfaceOnPhoto);
  const text = solid(palette.textPrimary);
  const secondary = solid(palette.textSecondaryOnPhoto);
  const { surface } = glassAlpha(level, true, theme === 'dark', frosted);
  // To'liq yopiq sirt ortini ko'rsatmaydi - u yerda muzlatish ham yo'q (glass.ts).
  const frost = frosted && surface < 1;

  let readable = 0;
  sample.cells.forEach((cell) => {
    const photo = mix(cell, background, cell.a);
    const behind = frost ? frostColor(photo, theme) : photo;
    const backdrop = mix(tint, behind, surface);
    if (
      contrastRatio(text, backdrop) >= MIN_TEXT_CONTRAST &&
      contrastRatio(secondary, backdrop) >= MIN_SECONDARY_CONTRAST
    ) {
      readable += 1;
    }
  });
  return readable / sample.cells.length;
};

/** Yorug' rejim fon shundan to'qroq bo'lsa - qorong'i (oq yozuvli) ko'rinishga o'tadi. */
export const DARK_PHOTO_LUMINANCE = 0.18;
/** Qorong'i rejim fon shundan ochroq bo'lsa - yorug' (to'q yozuvli) ko'rinishga o'tadi. */
export const BRIGHT_PHOTO_LUMINANCE = 0.45;

/**
 * Fon RASMINING yorqinligi (0..1).
 *
 * Xiralik (blur) rasmning rangini emas, faqat detalini o'zgartiradi -
 * shu sababli ko'rinish xiralikka qarab hech qachon sakramaydi.
 *
 * MEDIANA, o'rtacha emas: to'q rasmdagi bir nechta yorqin dog' yoki tasma
 * (neon chiziq, chiroq) o'rtachani ko'tarib, butun fonni "och" deb
 * ko'rsatardi.
 *
 * Faqat kontent qismi (CONTENT_TOP dan pastda): sarlavhalar tepada o'z
 * sirtida turadi, kartalar va ro'yxat esa pastda - matn rangi o'sha joyga
 * mos bo'lishi kerak.
 */
export const photoLuminance = (sample: PhotoSample, theme: ThemeName): number => {
  // Shaffof (PNG) kataklar ostida ilovaning foni ko'rinadi.
  const background = solid(PALETTES[theme].background);
  const below: number[] = [];
  const all: number[] = [];
  sample.cells.forEach((cell, index) => {
    const y = (Math.floor(index / sample.cols) + 0.5) / sample.rows;
    const seen = luminance(mix(cell, background, cell.a));
    all.push(seen);
    if (y >= CONTENT_TOP) below.push(seen);
  });
  const pool = (below.length ? below : all).sort((a, b) => a - b);
  if (pool.length === 0) return luminance(background);
  const mid = Math.floor(pool.length / 2);
  return pool.length % 2 ? pool[mid] : (pool[mid - 1] + pool[mid]) / 2;
};

/**
 * Fon rasmi ustida qaysi ko'rinish: matn rangi rasmga qarama-qarshi.
 *
 * 1. YORQINLIK: tanlangan rejim faqat rasm "o'rtacha" bo'lganda hal
 *    qiladi - to'q rasmda yorug' rejim oq yozuvli, och rasmda qorong'i
 *    rejim to'q yozuvli ko'rinishga o'tadi.
 *
 * 2. SHAFFOFLIK (`level` berilsa): shaffof darajada matn rasmning o'zi
 *    ustida turadi va o'rtacha rasmda (kulrang, to'yingan pushti) 1-qadam
 *    tanlagan ko'rinish o'qilmay qolishi mumkin. Shunda ikkinchi ko'rinish
 *    ANIQ ko'proq joyda o'qilsagina unga o'tiladi. Yopiq darajalarda
 *    ("Yo'q", "Kam") ikkala ko'rinish ham hamma joyda o'qiladi (test
 *    qulflaydi) - u yerda bu qadam hech narsani o'zgartirmaydi.
 *
 * Tanlovning o'zi o'zgarmaydi - rasm almashsa yoki olib tashlansa, u
 * qaytadi.
 */
export const photoTheme = (
  preferred: ThemeName,
  sample: PhotoSample,
  level?: TransparencyLevel,
): ThemeName => {
  if (sample.cells.length === 0) return preferred;
  const seen = photoLuminance(sample, preferred);
  let look = preferred;
  if (preferred === 'light' && seen < DARK_PHOTO_LUMINANCE) look = 'dark';
  if (preferred === 'dark' && seen > BRIGHT_PHOTO_LUMINANCE) look = 'light';
  if (level === undefined) return look;

  const share = readableShare(sample, look, level);
  if (share === 1) return look;
  const other: ThemeName = look === 'light' ? 'dark' : 'light';
  return readableShare(sample, other, level) > share ? other : look;
};
