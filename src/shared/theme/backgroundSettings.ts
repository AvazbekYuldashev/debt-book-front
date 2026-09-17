/**
 * Foydalanuvchi tanlagan fon rasmi sozlamasi.
 *
 * Rasmning O'ZI serverga yuklanadi (attach moduli), bu yerda faqat uning
 * id'si va ko'rsatish parametrlari saqlanadi. Sabab: web'da rasmni
 * localStorage'ga solib bo'lmaydi (hajm chegarasi), mobil'da esa galereya
 * uri'si ilova qayta o'rnatilgach yaroqsiz bo'lib qoladi. Attach id ikkala
 * platformada ham barqaror.
 *
 * Mavzu rejimi kabi QURILMADA saqlanadi: bu ko'rinish sozlamasi, hisobga
 * emas, ilovaga tegishli.
 *
 * Bu fayl ataylab sof: React'siz sinaladi, chunki buzuq JSON yoki eski
 * formatdagi yozuv butun ilovani ochilmas qilib qo'yishi mumkin.
 */

/** Rasm maydonga qanday moslanadi. */
export type BackgroundFit =
  /** To'ldirish: chetlari qirqiladi, bo'sh joy qolmaydi. */
  | 'cover'
  /** Sig'dirish: rasm butunlay ko'rinadi, yon tomonlarda bo'sh joy qolishi mumkin. */
  | 'contain';

export interface BackgroundSettings {
  /** Attach id. Bo'sh satr = fon rasmi yo'q, bezakli SVG fon ishlatiladi. */
  imageId: string;
  fit: BackgroundFit;
  /**
   * Xiralashtirish kuchi, 0..1. Rasm ustidagi mavzu rangli parda.
   *
   * Nolga tushirib bo'lmasligi ataylab: yorqin rasm ustida matn o'qilmay
   * qoladi. Pastki chegara MIN_DIM.
   */
  dim: number;
}

/** Parda shaffofligining eng past qiymati — matn o'qilishi kafolati. */
export const MIN_DIM = 0.25;
export const MAX_DIM = 0.9;
const DEFAULT_DIM = 0.55;

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  imageId: '',
  fit: 'cover',
  dim: DEFAULT_DIM,
};

export const BACKGROUND_STORAGE_KEY = 'debt-book.background';

function isFit(value: unknown): value is BackgroundFit {
  return value === 'cover' || value === 'contain';
}

/** Xiralikni ruxsat etilgan oraliqqa keltiradi (NaN ham standartga tushadi). */
export function clampDim(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return DEFAULT_DIM;
  return Math.min(MAX_DIM, Math.max(MIN_DIM, num));
}

/**
 * Saqlangan satrni sozlamaga aylantiradi.
 *
 * Har qanday nosozlikda standart qiymat qaytadi — sozlama buzilgani uchun
 * ilova ochilmay qolishi mumkin emas.
 */
export function parseBackground(raw: string | null | undefined): BackgroundSettings {
  if (!raw) return DEFAULT_BACKGROUND;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_BACKGROUND;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return DEFAULT_BACKGROUND;

  const record = parsed as Record<string, unknown>;
  const imageId = typeof record.imageId === 'string' ? record.imageId.trim() : '';

  return {
    imageId,
    fit: isFit(record.fit) ? record.fit : DEFAULT_BACKGROUND.fit,
    dim: clampDim(record.dim),
  };
}

export function serializeBackground(settings: BackgroundSettings): string {
  return JSON.stringify({
    imageId: settings.imageId.trim(),
    fit: settings.fit,
    dim: clampDim(settings.dim),
  });
}

/** Fon rasmi tanlanganmi (bo'sh id = yo'q). */
export function hasBackgroundImage(settings: BackgroundSettings): boolean {
  return settings.imageId.trim().length > 0;
}
