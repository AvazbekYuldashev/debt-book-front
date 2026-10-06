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
   * NOLGA TUSHIRISH MUMKIN. Avval eng past qiymat 0.25 edi - "matn
   * o'qilsin" degan niyat bilan. Amalda esa matn deyarli hamma joyda
   * kartalar ustida turadi va ular o'z foniga ega; parda esa butun
   * rasmni oqartirib, odam tanlagan rasm tanib bo'lmas holga kelardi.
   * Qaysi biri muhimligini foydalanuvchining o'zi hal qiladi.
   */
  dim: number;
}

/** Pardasiz ham mumkin: rasm o'z holicha ko'rinadi. */
export const MIN_DIM = 0;
export const MAX_DIM = 0.9;
/**
 * Standart parda YENGIL.
 *
 * Avvalgi 0.55 yorug' mavzuda deyarli oq qatlam edi va rasmni tanib
 * bo'lmas qilardi. Bu qiymat rasmni saqlaydi, ustidagi sarlavha esa
 * baribir o'qiladi.
 */
const DEFAULT_DIM = 0.15;

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  imageId: '',
  fit: 'cover',
  dim: DEFAULT_DIM,
};

export const BACKGROUND_STORAGE_KEY = 'debt-book.background';

function isFit(value: unknown): value is BackgroundFit {
  return value === 'cover' || value === 'contain';
}

/**
 * Xiralikni ruxsat etilgan oraliqqa keltiradi.
 *
 * QIYMAT YO'QLIGI alohida qaraladi: `null` va `undefined` "tanlanmagan"
 * degani, standart qiymat qaytadi. Oddiy `Number(null)` nol berardi va
 * u eng past chegaraga tushib, server fon tanlanmagan profil uchun
 * `null` qaytarganda rasm deyarli pardasiz chiqib qolardi.
 */
export function clampDim(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_DIM;
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

/**
 * Serverdan kelgan obyektni sozlamaga aylantiradi.
 *
 * `parseBackground` dan farqi: u SATR (qurilmada saqlangan JSON) bilan
 * ishlaydi, bu esa tayyor obyekt bilan. Ikkovida ham tekshiruv bir xil
 * qat'iy - eski ilova yoki boshqa mijoz noto'g'ri qiymat yuborsa, fon
 * chizilmay qolishi mumkin emas.
 *
 * null = hisobda fon umuman yo'q, standart qiymat qaytadi.
 */
export function fromRemote(raw: unknown): BackgroundSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_BACKGROUND;

  const record = raw as Record<string, unknown>;
  return {
    imageId: typeof record.imageId === 'string' ? record.imageId.trim() : '',
    fit: isFit(record.fit) ? record.fit : DEFAULT_BACKGROUND.fit,
    dim: clampDim(record.dim),
  };
}

/** Qurilmada saqlash kaliti - HAR HISOB UCHUN ALOHIDA.
 *
 * Umumiy kalit bitta telefondagi ikkinchi hisobga birinchisining fonini
 * ko'rsatardi. Bu nusxa faqat tez chizish uchun: haqiqiy manba server. */
export function backgroundKey(profileId: string): string {
  return `${BACKGROUND_STORAGE_KEY}.${profileId}`;
}

export function serializeBackground(settings: BackgroundSettings): string {
  return JSON.stringify({
    imageId: settings.imageId.trim(),
    fit: settings.fit,
    dim: clampDim(settings.dim),
  });
}

/**
 * Xiralikning HAQIQIY blur qismi: har 0.1 parda uchun 4px.
 *
 * Ilgari "Xiralik" faqat rang pardasi edi - rasm keskin qolardi va
 * shaffof sirt ostida uning mayda detallari (tosh yoriqlari, barglar)
 * matn bilan aralashib ketardi. Android (One UI) va iOS buni rasmni
 * xiralashtirib hal qiladi: rasm ko'rinadi, lekin detallari matnga
 * xalaqit bermaydi.
 *
 * Alohida sozlama emas: odam "xiralik" deganda aynan shuni kutadi.
 * "Yo'q" - rasm o'z holicha, "Kuchli" - One UI ilovalar ro'yxatidagidek.
 */
export const BLUR_PER_DIM = 40;

/** Fon rasmining blur radiusi, piksel. */
export function photoBlur(dim: unknown): number {
  return Math.round(clampDim(dim) * BLUR_PER_DIM);
}

/** Fon rasmi tanlanganmi (bo'sh id = yo'q). */
export function hasBackgroundImage(settings: BackgroundSettings): boolean {
  return settings.imageId.trim().length > 0;
}
