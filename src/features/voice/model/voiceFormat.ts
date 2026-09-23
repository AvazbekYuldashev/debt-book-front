/**
 * Yozib olish formati.
 *
 * Brauzerlar bir xil formatni qo'llab-quvvatlamaydi: Chrome webm/opus beradi,
 * Safari esa mp4. Shuning uchun format QAT'IY tanlanmaydi — brauzerdan
 * so'raymiz va u qabul qilganini ishlatamiz.
 *
 * Sof modul: `MediaRecorder` bu yerda chaqirilmaydi, tekshiruv funksiya
 * sifatida keladi. Shu sababli testda brauzer kerak emas.
 */

/**
 * Afzallik tartibi.
 *
 * Opus oldinda: u gap uchun eng ixcham va sifatli. Fayl kichik bo'lgani
 * muhim — yozuv mobil internet orqali yuklanadi.
 */
export const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
] as const;

export type MimeSupportCheck = (mimeType: string) => boolean;

/**
 * Brauzer qabul qiladigan birinchi formatni qaytaradi.
 *
 * Hech biri to'g'ri kelmasa `null` — bu "formatsiz yozib ko'raylik" degani
 * emas, "bu brauzerda yozib bo'lmaydi" degani. Tugma ko'rsatilmaydi.
 */
export function pickMimeType(isSupported: MimeSupportCheck): string | null {
  for (const type of PREFERRED_MIME_TYPES) {
    try {
      if (isSupported(type)) return type;
    } catch {
      // Ba'zi brauzerlar noma'lum turga istisno ko'taradi — keyingisiga o'tamiz.
    }
  }
  return null;
}

/**
 * Fayl nomi.
 *
 * Kengaytma to'g'ri bo'lishi kerak: tanish xizmati faylni nomidan ham
 * aniqlaydi, `.bin` yuborsak formatni tushunmay qolishi mumkin.
 */
export function fileNameFor(mimeType: string | null): string {
  const base = (mimeType ?? '').split(';')[0].trim().toLowerCase();
  const extensions: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
  };
  return `ovoz.${extensions[base] ?? 'webm'}`;
}

/**
 * Yozuv jo'natishga yaroqlimi.
 *
 * Juda kichik fayl — tugma tasodifan bosilgan. Uni yubormaymiz: xizmat
 * pullik, va javob baribir bo'sh keladi.
 */
export const MIN_RECORDING_BYTES = 1200;

export function isWorthSending(sizeInBytes: number): boolean {
  return sizeInBytes >= MIN_RECORDING_BYTES;
}
