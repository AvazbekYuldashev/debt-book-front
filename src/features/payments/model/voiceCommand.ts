import type { VoiceUsage } from '../api/usage';

/**
 * Bitta ovozli buyruq: ovozni tanish va gapni tushunish BIRGA.
 *
 * NEGA BIRLASHTIRILADI: odam uchun bu bitta ish - u bir marta gapirdi.
 * Ikki qator bo'lib turgani texnik tafsilot: biz ikkita xizmatga
 * murojaat qilamiz. Tarixda ularni alohida ko'rsatish "nega ikkita
 * yozuv paydo bo'ldi" degan savol tug'dirardi, va buyruq qancha
 * turganini bilish uchun ikkita raqamni qo'shib chiqish kerak bo'lardi.
 */
export interface VoiceCommand {
  /** Guruhning kaliti: buyruq belgisi yoki yolg'iz yozuvning id'si. */
  key: string;
  /** Eng erta yozuv vaqti - butun buyruq shu paytda boshlangan. */
  at: string;
  /** Ovozni tanish qismi. Eski yozuvlarda yolg'iz turishi mumkin. */
  stt: VoiceUsage | null;
  /** Gapni tushunish qismi. Model chaqirilmagan bo'lsa yo'q. */
  model: VoiceUsage | null;
  /** Ikkala qismning jami narxi. */
  cost: number;
}

/**
 * Sarf yozuvlarini buyruqlar bo'yicha guruhlaydi.
 *
 * Belgisi yo'q eski yozuvlar O'Z holicha qoladi: ular yozilganda bunday
 * bog'lanish yo'q edi va uni endi tiklab bo'lmaydi. Ularni vaqt bo'yicha
 * taxmin qilib qo'shish noto'g'ri guruhlar yasardi.
 *
 * Sof funksiya: ekranga bog'liq emas, shuning uchun sinaladi.
 */
export const groupByCommand = (usage: VoiceUsage[]): VoiceCommand[] => {
  const groups = new Map<string, VoiceCommand>();

  for (const item of usage) {
    if (!item?.id) continue;

    // Belgisiz yozuv o'z id'si bilan yolg'iz guruh bo'ladi.
    const key = item.commandId || `solo-${item.id}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        at: item.createdDate,
        stt: item.source === 'STT' ? item : null,
        model: item.source === 'MODEL' ? item : null,
        cost: item.cost ?? 0,
      });
      continue;
    }

    if (item.source === 'MODEL') existing.model = item;
    else existing.stt = item;

    existing.cost += item.cost ?? 0;
    // Buyruq ERTAROQ boshlangan paytda turadi: ovoz avval yoziladi,
    // tushunish undan keyin. Kechki vaqtni olsak qator ro'yxatda
    // o'zidan keyingi ishlardan yuqorida turib qolardi.
    if (Date.parse(item.createdDate) < Date.parse(existing.at)) {
      existing.at = item.createdDate;
    }
  }

  return [...groups.values()];
};
