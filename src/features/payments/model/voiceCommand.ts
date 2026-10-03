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
 * Belgisiz yozuvni oldingi ovozga bog'lash oynasi.
 *
 * O'lchangan: tushunish o'z ovozidan 1,3-2,8 soniya keyin yoziladi.
 * Bir daqiqa shunga nisbatan juda keng, lekin sekin tarmoqda ham
 * yetadi - va ikki buyruq orasidagi tanaffus bundan qisqa bo'lishi
 * amalda uchramaydi, chunki orada odam gapirib ulgurishi kerak.
 */
const LEGACY_WINDOW_MS = 60_000;

/**
 * Bitta buyruq ichidagi ikkinchi model chaqiruvini birinchisiga qo'shadi.
 *
 * NEGA QO'SHILADI: qayta urinish AYNAN o'sha gapni tushunish uchun
 * ketgan. Ikkalasi ham o'sha ovozning xarajati, shuning uchun tokenlar
 * ham, narx ham yig'iladi. Oxirgisini olib qo'ysak, sarflangan
 * tokenlarning bir qismi hisobdan tushib qolardi.
 */
const mergeModel = (current: VoiceUsage | null, next: VoiceUsage): VoiceUsage =>
  current
    ? {
        ...current,
        promptTokens: current.promptTokens + next.promptTokens,
        completionTokens: current.completionTokens + next.completionTokens,
        cost: (current.cost ?? 0) + (next.cost ?? 0),
      }
    : next;

/** Eski yozuvlarda tur ko'rsatilmagan - ular ovozni tanish edi. */
const isModel = (item: VoiceUsage): boolean => item.source === 'MODEL';

/**
 * Sarf yozuvlarini buyruqlar bo'yicha guruhlaydi.
 *
 * Asosiy yo'l - buyruq belgisi: ilova ovoz va tushunish uchun bitta
 * belgi yuboradi va ikkovi shu belgi bilan topishadi.
 *
 * BELGISIZ YOZUVLAR vaqt bo'yicha bog'lanadi. Ular ikki joydan keladi:
 * belgi joriy etilishidan oldingi eski yozuvlar, va Play'dagi eski
 * ilova o'rnatilgan telefonlar - ular hali ham belgi yubormaydi.
 * Bog'lash faqat ORQAGA qaraydi: tushunish doim o'z ovozidan keyin
 * yoziladi, shuning uchun har bir belgisiz model yozuvi o'zidan
 * oldingi eng yaqin ovozga tegishli.
 *
 * Sof funksiya: ekranga bog'liq emas, shuning uchun sinaladi.
 */
export const groupByCommand = (usage: VoiceUsage[]): VoiceCommand[] => {
  // Vaqt bo'yicha O'SISH tartibida: orqaga qarab bog'lash uchun ovoz
  // o'z tushunishidan oldin ko'rilgan bo'lishi kerak.
  const ordered = [...usage]
    .filter((item) => item?.id)
    .sort((a, b) => Date.parse(a.createdDate) - Date.parse(b.createdDate));

  const groups = new Map<string, VoiceCommand>();
  let lastVoice: { key: string; at: number } | null = null;

  for (const item of ordered) {
    const at = Date.parse(item.createdDate);
    let key = item.commandId || '';

    if (!key) {
      const linkable =
        isModel(item) &&
        lastVoice !== null &&
        !Number.isNaN(at) &&
        at - lastVoice.at <= LEGACY_WINDOW_MS;

      key = linkable ? lastVoice!.key : `solo-${item.id}`;
    }

    if (!isModel(item)) lastVoice = { key, at };

    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        at: item.createdDate,
        stt: isModel(item) ? null : item,
        model: isModel(item) ? item : null,
        cost: item.cost ?? 0,
      });
      continue;
    }

    if (isModel(item)) existing.model = mergeModel(existing.model, item);
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
