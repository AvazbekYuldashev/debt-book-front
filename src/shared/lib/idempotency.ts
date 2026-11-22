import * as Crypto from 'expo-crypto';
import type { AxiosRequestConfig } from 'axios';

// ============================================================
//  "Bir amal — bitta yozuv" kaliti.
//
//  Server shu kalit bo'yicha takroriy so'rovni taniydi va amalni QAYTA
//  BAJARMAYDI (backend: `IdempotencyFilter`). Kalitsiz so'rov esa
//  avvalgidek ishlaydi, ya'ni bu qo'shimcha himoya, majburiyat emas.
// ============================================================

/** Backend kutayotgan sarlavha nomi. */
export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

/**
 * Bir martalik kalit.
 *
 * QAYERDA CHAQIRILADI MUHIM: kalit FOYDALANUVCHI AMALIGA bittadan
 * yaratilishi kerak — "saqlash" bosilganda bir marta — va o'sha amalning
 * barcha urinishlarida O'ZGARMASLIGI kerak.
 *
 * Shuning uchun u `apiClient` interceptorida yaratilmaydi: interceptor
 * har qayta urinishda yangi kalit berib, himoyani yo'qqa chiqarardi —
 * server ikkita so'rovni ikkita boshqa amal deb qabul qilardi.
 *
 * Xuddi shu sababdan kalit so'rov TANASIDAN hisoblanmaydi: ikkita
 * bir xil xarajat (masalan ikki marta 10 000 so'm) qonuniy holat va
 * ularni bitta deb hisoblash ma'lumotni yo'qotardi.
 *
 * UCH ZAXIRA YO'L. Kalit yaratilmay qolsa pul saqlash BUTUNLAY ishdan
 * chiqardi — bu himoyaning o'zidan ko'ra og'irroq zarar. Shuning uchun
 * `expo-crypto` bo'lmasa brauzer `crypto` si, u ham bo'lmasa vaqt +
 * tasodifiy son ishlatiladi. Kalit faqat BITTA foydalanuvchi ichida va
 * 14 kun davomida betakror bo'lsa yetarli — bu oxirgi yo'l uchun ham
 * ortig'i bilan bajariladigan shart.
 */
export const newIdempotencyKey = (): string => {
  try {
    if (typeof Crypto.randomUUID === 'function') return Crypto.randomUUID();
  } catch {
    // Pastdagi yo'llarga o'tamiz.
  }
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID();
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

/**
 * Kalitni so'rov sozlamasiga qo'shadi.
 *
 * Kalit berilmasa sozlama o'zgarishsiz qaytadi — chaqiruvchi joylarda
 * shart yozib o'tirmaslik uchun.
 */
export const withIdempotencyKey = (
  config: AxiosRequestConfig | undefined,
  key: string | undefined,
): AxiosRequestConfig | undefined => {
  if (!key) return config;
  return {
    ...config,
    headers: { ...config?.headers, [IDEMPOTENCY_HEADER]: key },
  };
};
