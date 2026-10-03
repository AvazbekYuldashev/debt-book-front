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
   * BELGISIZ tushunish o'zidan oldingi ovozga bog'lanadi.
   *
   * Bunday yozuvlar ikki joydan keladi: belgi joriy etilishidan
   * oldingi eskilar, va Play'dagi eski ilova o'rnatilgan telefonlar -
   * ular hali ham belgi yubormaydi. Bog'lamasak, odam bitta gapirib
   * ikkita qator ko'rardi.
   */
  it('belgisiz tushunish oldingi ovozga boglanadi', () => {
    const commands = groupByCommand([
      usage({ id: 'a', source: 'STT', createdDate: '2026-10-02T01:19:59', cost: 69.3 }),
      usage({
        id: 'b', source: 'MODEL', createdDate: '2026-10-02T01:20:00',
        cost: 0, promptTokens: 637, completionTokens: 75,
      }),
    ]);

    expect(commands).toHaveLength(1);
    expect(commands[0].stt?.id).toBe('a');
    expect(commands[0].model?.id).toBe('b');
  });

  /** Bog'lash faqat ORQAGA qaraydi - tushunish doim ovozdan keyin. */
  it('ovozdan oldingi tushunish boglanmaydi', () => {
    const commands = groupByCommand([
      usage({ id: 'b', source: 'MODEL', createdDate: '2026-10-02T01:19:00' }),
      usage({ id: 'a', source: 'STT', createdDate: '2026-10-02T01:19:05' }),
    ]);

    expect(commands).toHaveLength(2);
  });

  /** Oyna tashqarisidagi yozuv boshqa buyruqdan - qo'shilmaydi. */
  it('uzoq vaqtdagi tushunish boglanmaydi', () => {
    const commands = groupByCommand([
      usage({ id: 'a', source: 'STT', createdDate: '2026-10-02T01:19:00' }),
      usage({ id: 'b', source: 'MODEL', createdDate: '2026-10-02T01:25:00' }),
    ]);

    expect(commands).toHaveLength(2);
  });

  /**
   * QAYTA URINISH aynan o'sha gapni tushunish uchun ketgan - ikkala
   * chaqiruv ham o'sha ovozning xarajati. Oxirgisini olib qo'ysak,
   * sarflangan tokenlarning bir qismi hisobdan tushib qolardi.
   */
  it('ikki model chaqiruvining tokenlari qoshiladi', () => {
    const commands = groupByCommand([
      usage({ id: 'a', source: 'STT', createdDate: '2026-10-02T01:19:59', cost: 69.3 }),
      usage({
        id: 'b', source: 'MODEL', createdDate: '2026-10-02T01:20:00',
        cost: 0, promptTokens: 637, completionTokens: 75,
      }),
      usage({
        id: 'c', source: 'MODEL', createdDate: '2026-10-02T01:20:01',
        cost: 0, promptTokens: 581, completionTokens: 64,
      }),
    ]);

    expect(commands).toHaveLength(1);
    expect(commands[0].model?.promptTokens).toBe(1218);
    expect(commands[0].model?.completionTokens).toBe(139);
  });

  /** Ikki ovoz ketma-ket kelsa, har biri o'z qatorida qoladi. */
  it('ketma-ket ikki ovoz qoshilmaydi', () => {
    const commands = groupByCommand([
      usage({ id: 'a', createdDate: '2026-09-30T01:04:00' }),
      usage({ id: 'b', createdDate: '2026-09-30T01:04:02' }),
    ]);

    expect(commands).toHaveLength(2);
    expect(commands.map((c) => c.key)).toEqual(['solo-a', 'solo-b']);
  });

  /**
   * Tushunish eng yaqin oldingi ovozga tegishli: oradagi ovoz
   * bog'lanishni o'ziga oladi.
   */
  it('tushunish eng yaqin oldingi ovozga tegishli', () => {
    const commands = groupByCommand([
      usage({ id: 'a', source: 'STT', createdDate: '2026-10-02T01:19:00' }),
      usage({ id: 'b', source: 'STT', createdDate: '2026-10-02T01:19:30' }),
      usage({ id: 'm', source: 'MODEL', createdDate: '2026-10-02T01:19:31' }),
    ]);

    expect(commands).toHaveLength(2);
    expect(commands.find((c) => c.key === 'solo-b')?.model?.id).toBe('m');
    expect(commands.find((c) => c.key === 'solo-a')?.model).toBeNull();
  });

  /** Eski yozuvlarda tur ko'rsatilmagan - ular ovozni tanish edi. */
  it('tursiz eski yozuv ovoz deb qaraladi', () => {
    const commands = groupByCommand([
      usage({ id: 'a', source: undefined, createdDate: '2026-09-30T01:04:00' }),
    ]);

    expect(commands[0].stt?.id).toBe('a');
    expect(commands[0].model).toBeNull();
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
