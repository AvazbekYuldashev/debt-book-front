import { feedKey, topUpHistory, voiceHistory } from '../feed';
import type { VoiceUsage } from '../../api/usage';
import type { PaymentHistory } from '../../api/payments';

/**
 * Pul CHIQQANI va KIRGANI ikki alohida ro'yxatda turadi.
 *
 * Aralashgan oqimda ikkala savolga javob qiyinlashardi: "ovozga qancha
 * ketdi" deb qaraganda to'lovlar orasidan terib chiqish, "qancha
 * to'ladim" deb qaraganda esa o'nlab sarf qatorini aylantirish kerak edi.
 */
const usage = (id: string, at: string, commandId?: string): VoiceUsage => ({
  id,
  createdDate: at,
  durationMs: 5000,
  cost: 37.5,
  ratePerMinute: 450,
  source: 'STT',
  promptTokens: 0,
  completionTokens: 0,
  sizeBytes: 75000,
  commandId,
});

const topUp = (id: string, created: string, paid: string | null): PaymentHistory => ({
  id,
  createdDate: created,
  paidDate: paid,
  amount: 10000,
  status: paid ? 'PAID' : 'CANCELLED',
});

describe('voiceHistory', () => {
  it('yangisi tepada turadi', () => {
    const rows = voiceHistory([
      usage('v1', '2026-10-01T08:00:00'),
      usage('v2', '2026-10-01T10:00:00'),
    ]);

    // Belgisiz yozuv o'z id'si bilan YOLG'IZ guruh bo'ladi: eski
    // yozuvlarda buyruq belgisi yo'q va uni tiklab bo'lmaydi.
    expect(rows.map(feedKey)).toEqual(['v-solo-v2', 'v-solo-v1']);
  });

  /** Bitta gapirish - bitta qator, ichida ikkita xizmat bo'lsa ham. */
  it('bitta buyruqning ikki qismi bitta qator boladi', () => {
    const rows = voiceHistory([
      usage('v1', '2026-10-01T10:00:00', 'cmd-1'),
      { ...usage('v2', '2026-10-01T10:00:02', 'cmd-1'), source: 'MODEL', cost: 0 },
    ]);

    expect(rows).toHaveLength(1);
    expect(feedKey(rows[0])).toBe('v-cmd-1');
  });

  /** To'lovlar bu ro'yxatga umuman tushmaydi. */
  it('tolovlarni aralashtirmaydi', () => {
    expect(voiceHistory([])).toEqual([]);
  });
});

describe('topUpHistory', () => {
  /**
   * TO'LANGAN payt bo'yicha saralanadi. Odam havolani ochib, bir soatdan
   * keyin to'lashi mumkin - balans esa aynan to'lov daqiqasida o'zgaradi.
   */
  it('tolangan payt boyicha turadi', () => {
    const rows = topUpHistory([
      topUp('p1', '2026-10-01T09:00:00', '2026-10-01T12:00:00'),
      topUp('p2', '2026-10-01T10:00:00', '2026-10-01T10:30:00'),
    ]);

    expect(rows.map(feedKey)).toEqual(['p-p1', 'p-p2']);
  });

  /** Bekor qilinganda to'langan payt yo'q - yaratilgan payt ishlatiladi. */
  it('bekor qilingan tolov yaratilgan payt boyicha turadi', () => {
    const rows = topUpHistory([topUp('p1', '2026-10-01T09:00:00', null)]);

    expect(rows).toHaveLength(1);
    expect(rows[0].at).toBe('2026-10-01T09:00:00');
  });

  /** Id'siz yozuv kalitsiz qolardi - ro'yxat uni tashlab ketadi. */
  it('idsiz yozuv tushib qoladi', () => {
    const broken = { ...topUp('', '2026-10-01T09:00:00', null), id: '' };

    expect(topUpHistory([broken])).toEqual([]);
  });
});
