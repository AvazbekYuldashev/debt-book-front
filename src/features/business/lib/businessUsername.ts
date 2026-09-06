import type { BusinessDTO } from '../types/business';

// ============================================================
//  Biznes username: qo'llab-quvvatlanishini aniqlash, tekshirish va
//  ekranda ko'rsatish. Talablar: docs/business-username.md
// ============================================================

/** Ruxsat etilgan ko'rinish: 4-30 belgi, lotin/raqam, ichida `_` yoki `.`. */
const USERNAME_RE = /^[a-z0-9]([a-z0-9]|[._](?![._])){2,28}[a-z0-9]$/;

export const USERNAME_MIN = 4;
export const USERNAME_MAX = 30;

/**
 * Kiritilgan username to'g'rimi? Xato bo'lsa i18n KALITI, to'g'ri bo'lsa ''.
 *
 * Server baribir qayta tekshiradi (va yagonalikni faqat u biladi) — bu
 * yerdagi tekshiruv shunchaki foydalanuvchini keraksiz so'rovdan va
 * kutishdan qutqaradi.
 */
export const validateBusinessUsername = (raw: string): string => {
  const value = raw.trim().toLowerCase();
  if (!value) return 'business.usernameRequired';
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) return 'business.usernameInvalid';
  if (!USERNAME_RE.test(value)) return 'business.usernameInvalid';
  return '';
};

/** Kiritish paytida normallashtirish — server lowercase saqlaydi. */
export const normalizeBusinessUsername = (raw: string): string =>
  raw.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');

/**
 * Biznesni EKRANDA belgilash uchun matn: username bo'lsa — u, bo'lmasa UUID.
 *
 * DIQQAT: faqat KO'RSATISH uchun. So'rovlarda baribir `id` yuboriladi —
 * username bo'yicha izlash endpointi tayyor bo'lgunicha.
 */
export const businessHandle = (business: Pick<BusinessDTO, 'id' | 'username'>): string =>
  business.username?.trim() || business.id;

/** Yorliq kaliti: username ko'rsatilayotganda "Biznes ID" deyish noto'g'ri. */
export const businessHandleLabelKey = (
  business: Pick<BusinessDTO, 'username'>,
): 'business.usernameLabel' | 'business.idLabel' =>
  business.username?.trim() ? 'business.usernameLabel' : 'business.idLabel';
