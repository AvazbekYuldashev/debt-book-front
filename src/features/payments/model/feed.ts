import type { VoiceUsage } from '../api/usage';
import { groupByCommand, type VoiceCommand } from './voiceCommand';
import type { PaymentHistory } from '../api/payments';

/**
 * Tarixning bitta qatori.
 *
 * Ikki manba bitta oqimga qo'shiladi: pul KIRGANI (Click orqali
 * to'ldirish) va pul CHIQQANI (ovoz sarfi). Ularni alohida ro'yxatlarda
 * ko'rsatsak, odam balans qanday o'zgarganini kuzatolmasdi - har safar
 * ikkita ro'yxatni ko'zda solishtirib chiqish kerak bo'lardi.
 */
export type FeedEntry =
  | { kind: 'VOICE'; at: string; command: VoiceCommand }
  | { kind: 'TOPUP'; at: string; payment: PaymentHistory };

/** Ro'yxatda ishlatiladigan barqaror kalit. */
export const feedKey = (entry: FeedEntry): string =>
  entry.kind === 'VOICE' ? `v-${entry.command.key}` : `p-${entry.payment.id}`;

/**
 * Ikki tarixni bitta oqimga qo'shadi, yangisidan boshlab.
 *
 * TO'LOV VAQTI to'langan payt bo'yicha olinadi, yaratilgan payt bo'yicha
 * emas: odam havolani ochib, bir soatdan keyin to'lashi mumkin va o'shanda
 * balans aynan to'lov daqiqasida o'zgaradi. Yaratilish vaqti bo'yicha
 * saralasak, qator sarf yozuvlari orasida noto'g'ri joyda turardi.
 *
 * Sof funksiya: ekranga bog'liq emas, shuning uchun sinaladi.
 */
export const mergeFeed = (
  usage: VoiceUsage[],
  payments: PaymentHistory[],
): FeedEntry[] => {
  const entries: FeedEntry[] = [];

  // Ovoz yozuvlari avval BUYRUQLARGA yig'iladi: odam uchun bitta
  // gapirish - bitta ish, ikki qator emas.
  for (const command of groupByCommand(usage)) {
    entries.push({ kind: 'VOICE', at: command.at, command });
  }
  for (const item of payments) {
    if (!item?.id) continue;
    entries.push({ kind: 'TOPUP', at: item.paidDate ?? item.createdDate, payment: item });
  }

  return entries.sort((a, b) => {
    const left = Date.parse(b.at);
    const right = Date.parse(a.at);
    // Buzuq sana oqimni ag'darib yubormasin - u oxiriga tushadi.
    if (Number.isNaN(left) && Number.isNaN(right)) return 0;
    if (Number.isNaN(left)) return -1;
    if (Number.isNaN(right)) return 1;
    return left - right;
  });
};
