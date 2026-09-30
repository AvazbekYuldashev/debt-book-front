import { feedKey, mergeFeed, type FeedEntry } from '../feed';
import type { VoiceUsage } from '../../api/usage';
import type { PaymentHistory } from '../../api/payments';

/**
 * Pul KIRGANI va CHIQQANI bitta oqimda turishi kerak.
 *
 * Alohida ro'yxatlarda ko'rsatsak, odam balans qanday o'zgarganini
 * kuzata olmasdi - har safar ikkovini ko'zda solishtirish kerak bo'lardi.
 */
const usage = (id: string, at: string): VoiceUsage => ({
  id,
  createdDate: at,
  durationMs: 5000,
  cost: 37.5,
  ratePerMinute: 450,
  source: 'STT',
  promptTokens: 0,
  completionTokens: 0,
  sizeBytes: 75000,
});

const topUp = (id: string, created: string, paid: string | null): PaymentHistory => ({
  id,
  createdDate: created,
  paidDate: paid,
  amount: 10000,
  status: paid ? 'PAID' : 'CANCELLED',
});

describe('mergeFeed', () => {
  it('ikki tarix vaqt boyicha aralashadi, yangisi tepada', () => {
    const feed = mergeFeed(
      [usage('v1', '2026-10-01T10:00:00'), usage('v2', '2026-10-01T08:00:00')],
      [topUp('p1', '2026-10-01T09:00:00', '2026-10-01T09:00:00')],
    );

    expect(feed.map((e) => feedKey(e))).toEqual(['v-v1', 'p-p1', 'v-v2']);
  });

  /**
   * TO'LANGAN payt bo'yicha saralanadi. Odam havolani ochib, bir soatdan
   * keyin to'lashi mumkin - balans esa aynan to'lov daqiqasida o'zgaradi.
   */
  it('tolov yaratilgan emas, tolangan payt boyicha turadi', () => {
    const feed = mergeFeed(
      [usage('v1', '2026-10-01T09:30:00')],
      [topUp('p1', '2026-10-01T09:00:00', '2026-10-01T10:00:00')],
    );

    expect(feed.map((e) => feedKey(e))).toEqual(['p-p1', 'v-v1']);
  });

  /** Bekor qilinganda to'langan payt yo'q - yaratilgan payt ishlatiladi. */
  it('bekor qilingan tolov yaratilgan payt boyicha turadi', () => {
    const feed = mergeFeed([], [topUp('p1', '2026-10-01T09:00:00', null)]);

    expect(feed).toHaveLength(1);
    expect(feed[0].at).toBe('2026-10-01T09:00:00');
  });

  it('bosh royxatlar bosh oqim beradi', () => {
    expect(mergeFeed([], [])).toEqual([]);
  });

  /** Buzuq sana oqimni ag'darib yubormasligi kerak. */
  it('buzuq sana oxiriga tushadi', () => {
    const feed = mergeFeed([usage('v1', 'bu sana emas'), usage('v2', '2026-10-01T10:00:00')], []);

    expect(feedKey(feed[0])).toBe('v-v2');
    expect(feed).toHaveLength(2);
  });

  /** Kalitlar TURIGA qarab ajratiladi: id'lar ustma-ust tushishi mumkin. */
  it('bir xil id li turli yozuvlar ajratiladi', () => {
    const feed: FeedEntry[] = mergeFeed(
      [usage('x', '2026-10-01T10:00:00')],
      [topUp('x', '2026-10-01T09:00:00', '2026-10-01T09:00:00')],
    );

    expect(new Set(feed.map(feedKey)).size).toBe(2);
  });
});
