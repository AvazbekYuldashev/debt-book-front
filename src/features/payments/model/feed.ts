import type { VoiceUsage } from '../api/usage';
import { groupByCommand, type VoiceCommand } from './voiceCommand';
import type { PaymentHistory } from '../api/payments';

/**
 * Tarixning bitta qatori.
 *
 * Ikki xil harakat IKKI ALOHIDA ro'yxatda turadi: pul CHIQQANI (ovozga
 * sarf) va pul KIRGANI (Click orqali to'ldirish). Ular bir paytlar
 * bitta oqimga qo'shilgan edi, lekin aralashganda savolga javob
 * topilmay qoldi: "ovozga qancha ketdi" deb qaraganda to'lovlar
 * orasidan terib chiqish, "qancha to'ladim" deb qaraganda esa o'nlab
 * sarf qatorini aylantirib o'tish kerak bo'lardi. Ikkovi turlicha
 * o'qiladi, shuning uchun alohida.
 */
export type FeedEntry =
  | { kind: 'VOICE'; at: string; command: VoiceCommand }
  | { kind: 'TOPUP'; at: string; payment: PaymentHistory };

/** Ro'yxatda ishlatiladigan barqaror kalit. */
export const feedKey = (entry: FeedEntry): string =>
  entry.kind === 'VOICE' ? `v-${entry.command.key}` : `p-${entry.payment.id}`;

/**
 * Yangisi tepada.
 *
 * Buzuq sana butun ro'yxatni ag'darib yubormasligi uchun u oxiriga
 * tushadi - tartibsiz ro'yxat yo'q qatordan ham yomonroq.
 */
const newestFirst = (a: FeedEntry, b: FeedEntry): number => {
  const left = Date.parse(b.at);
  const right = Date.parse(a.at);
  if (Number.isNaN(left) && Number.isNaN(right)) return 0;
  if (Number.isNaN(left)) return -1;
  if (Number.isNaN(right)) return 1;
  return left - right;
};

/**
 * Ovozga sarflangan pul tarixi.
 *
 * Avval BUYRUQLARGA yig'iladi: odam uchun bitta gapirish - bitta ish,
 * garchi ichida ikkita xizmat chaqirilsa ham.
 */
export const voiceHistory = (usage: VoiceUsage[]): FeedEntry[] =>
  groupByCommand(usage)
    .map((command): FeedEntry => ({ kind: 'VOICE', at: command.at, command }))
    .sort(newestFirst);

/**
 * Click orqali to'langan pul tarixi.
 *
 * TO'LANGAN payt bo'yicha turadi, yaratilgan payt bo'yicha emas: odam
 * havolani ochib, bir soatdan keyin to'lashi mumkin va balans aynan
 * to'lov daqiqasida o'zgaradi. Bekor qilinganda to'langan payt yo'q -
 * o'shanda yaratilgan payt ishlatiladi.
 */
export const topUpHistory = (payments: PaymentHistory[]): FeedEntry[] =>
  payments
    .filter((item) => item?.id)
    .map((payment): FeedEntry => ({
      kind: 'TOPUP',
      at: payment.paidDate ?? payment.createdDate,
      payment,
    }))
    .sort(newestFirst);
