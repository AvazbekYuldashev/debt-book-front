import { groupByCommand } from '../voiceCommand';
import type { VoiceUsage } from '../../api/usage';

/**
 * Bitta ovozli buyruq = bitta qator.
 *
 * Odam uchun bu bitta ish: u bir marta gapirdi. Ikki qator bo'lib
 * turgani texnik tafsilot - biz ikkita xizmatga murojaat qilamiz.
 * Alohida ko'rsatish "nega ikkita yozuv paydo bo'ldi" degan savol
 * tug'dirardi va buyruq qancha turganini bilish uchun ikkita raqamni
 * qo'shib chiqish kerak bo'lardi.
 */
const usage = (over: Partial<VoiceUsage>): VoiceUsage => ({
  id: 'u1',
  createdDate: '2026-10-02T01:19:00',
  durationMs: 9000,
  cost: 69.3,
  ratePerMinute: 450,
  source: 'STT',
  promptTokens: 0,
  completionTokens: 0,
  sizeBytes: 135000,
  commandId: null,
  ...over,
});

describe('groupByCommand', () => {
  it('bir belgili ikki yozuv bitta buyruq boladi', () => {
    const commands = groupByCommand([
      usage({ id: 'a', source: 'STT', cost: 69.3, commandId: 'cmd-1' }),
      usage({ id: 'b', source: 'MODEL', cost: 0, promptTokens: 690, completionTokens: 47, commandId: 'cmd-1' }),
    ]);

    expect(commands).toHaveLength(1);
    expect(commands[0].stt?.id).toBe('a');
    expect(commands[0].model?.id).toBe('b');
  });

  /** Narx ikkala qismdan yig'iladi - odam bitta raqam ko'rishi kerak. */
  it('narx qoshiladi', () => {
    const commands = groupByCommand([
      usage({ id: 'a', source: 'STT', cost: 69.3, commandId: 'c' }),
      usage({ id: 'b', source: 'MODEL', cost: 12.5, commandId: 'c' }),
    ]);

    expect(commands[0].cost).toBeCloseTo(81.8);
  });

  /**
   * Buyruq ERTAROQ boshlangan paytda turadi: ovoz avval yoziladi,
   * tushunish undan keyin. Kechki vaqtni olsak qator ro'yxatda o'zidan
   * keyingi ishlardan yuqorida turib qolardi.
   */
  it('vaqt eng ertasi boyicha', () => {
    const commands = groupByCommand([
      usage({ id: 'b', source: 'MODEL', createdDate: '2026-10-02T01:19:30', commandId: 'c' }),
      usage({ id: 'a', source: 'STT', createdDate: '2026-10-02T01:19:00', commandId: 'c' }),
    ]);

    expect(commands[0].at).toBe('2026-10-02T01:19:00');
  });

  /**
   * Belgisiz ESKI yozuvlar yolg'iz qoladi. Ularni vaqt bo'yicha taxmin
   * qilib qo'shish noto'g'ri guruhlar yasardi.
   */
  it('belgisiz yozuvlar qoshilmaydi', () => {
    const commands = groupByCommand([
      usage({ id: 'a', createdDate: '2026-09-30T01:04:00' }),
      usage({ id: 'b', createdDate: '2026-09-30T01:04:02' }),
    ]);

    expect(commands).toHaveLength(2);
    expect(commands.map((c) => c.key)).toEqual(['solo-a', 'solo-b']);
  });

  /** Turli buyruqlar aralashmaydi. */
  it('turli belgilar ajratiladi', () => {
    const commands = groupByCommand([
      usage({ id: 'a', commandId: 'c1' }),
      usage({ id: 'b', commandId: 'c2' }),
    ]);

    expect(commands).toHaveLength(2);
  });

  it('bosh royxat bosh natija', () => {
    expect(groupByCommand([])).toEqual([]);
  });
});
