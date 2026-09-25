import { resolveVoiceCommand } from '../resolveVoiceCommand';
import type { VoiceIntent } from '../../api/voice';

const intent = (over: Partial<VoiceIntent> = {}): VoiceIntent => ({
  text: 'nonga',
  understood: true,
  ...over,
});

describe('resolveVoiceCommand', () => {
  it('odam va yo\'nalish aniq bo\'lsa oyna ochiladi', () => {
    const cmd = resolveVoiceCommand(
      intent({ contactOutcome: 'RESOLVED', contactId: 'c1', direction: 'GAVE', amount: 50000 }),
    );

    expect(cmd).toEqual({
      kind: 'OPEN_CONTACT',
      contactId: 'c1',
      prefill: { amount: 50000, direction: 'GAVE', note: 'nonga' },
    });
  });

  /** Summa aytilmasa ham odam va yo'nalish yetarli — qolganini qo'lda yozadi. */
  it('summasiz ham oyna ochiladi', () => {
    const cmd = resolveVoiceCommand(
      intent({ contactOutcome: 'RESOLVED', contactId: 'c1', direction: 'TOOK' }),
    );

    expect(cmd.kind).toBe('OPEN_CONTACT');
    expect(cmd.prefill.amount).toBeUndefined();
  });

  it('yo\'nalish noma\'lum bo\'lsa odamdan so\'raladi', () => {
    const cmd = resolveVoiceCommand(
      intent({ contactOutcome: 'RESOLVED', contactId: 'c1', amount: 50000 }),
    );

    expect(cmd.kind).toBe('ASK_DIRECTION');
    expect(cmd.kind === 'ASK_DIRECTION' && cmd.contactId).toBe('c1');
  });

  /**
   * ENG MUHIM QOIDA: ikkita Ali chiqsa birinchisi OLINMAYDI. Qarz begona
   * odamning yozuviga tushib qolishi mumkin va buni keyin topish qiyin.
   */
  it('bir nechta odam mos kelsa tanlov odamga qoladi', () => {
    const cmd = resolveVoiceCommand(
      intent({
        contactOutcome: 'AMBIGUOUS',
        amount: 50000,
        direction: 'GAVE',
        contactOptions: [
          { id: 'c1', name: 'Ali Valiyev' },
          { id: 'c2', name: 'Ali Karimov' },
        ],
      }),
    );

    expect(cmd.kind).toBe('CHOOSE_CONTACT');
    // Summa yo'qolmaydi — odam tanlangach o'sha oynaga tushadi.
    expect(cmd.prefill).toEqual({ amount: 50000, direction: 'GAVE', note: 'nonga' });
  });

  it('odam topilmasa xabar beriladi', () => {
    expect(resolveVoiceCommand(intent({ contactOutcome: 'NOT_FOUND' })).kind).toBe('NO_CONTACT');
    expect(resolveVoiceCommand(intent({})).kind).toBe('NO_CONTACT');
  });

  /** RESOLVED deyilgan-u, id kelmagan — ishonmaymiz. */
  it('id\'siz RESOLVED ishlatilmaydi', () => {
    expect(resolveVoiceCommand(intent({ contactOutcome: 'RESOLVED' })).kind).toBe('NO_CONTACT');
  });

  it('nol, manfiy va buzuq summa tashlanadi', () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const cmd = resolveVoiceCommand(
        intent({ contactOutcome: 'RESOLVED', contactId: 'c1', direction: 'GAVE', amount: bad }),
      );
      expect(cmd.prefill.amount).toBeUndefined();
    }
  });

  it('bo\'sh izoh yozilmaydi', () => {
    const cmd = resolveVoiceCommand(intent({ text: '   ', contactOutcome: 'NOT_FOUND' }));
    expect(cmd.prefill.note).toBeUndefined();
  });

  /** Model tushunmagan bo'lsa ham aytilgan matn izohga tushadi. */
  it('tushunilmagan gapda ham matn saqlanadi', () => {
    const cmd = resolveVoiceCommand(intent({ text: 'aliga pul berdim', understood: false }));
    expect(cmd.kind).toBe('NO_CONTACT');
    expect(cmd.prefill.note).toBe('aliga pul berdim');
  });
});

/**
 * "Barcha qarzimni qaytardim" - summa aytilmagan, ekrandagi qoldiqqa
 * havola qilingan. Server har valyutaga bitta qator qaytaradi.
 */
describe('barcha qoldiqni yopish', () => {
  it('bir nechta valyuta buyruqda saqlanadi', () => {
    const cmd = resolveVoiceCommand(
      intent({
        contactOutcome: 'RESOLVED',
        contactId: 'salom',
        direction: 'TOOK',
        amount: 1066422,
        currency: 'UZS',
        settlements: [
          { currency: 'UZS', amount: 1066422, direction: 'TOOK' },
          { currency: 'USD', amount: 20, direction: 'TOOK' },
        ],
      }),
    );

    // Ikkinchi valyuta YO'QOLMASLIGI kerak: eng kattasini olib qolganini
    // tashlash pulni jimgina yeb qo'yardi.
    expect(cmd.prefill.settlements).toHaveLength(2);
    expect(cmd.prefill.settlements?.[1]).toEqual({
      currency: 'USD',
      amount: 20,
      direction: 'TOOK',
    });
  });

  it('bitta valyuta bo\'lsa ham ro\'yxat o\'tadi', () => {
    const cmd = resolveVoiceCommand(
      intent({
        contactOutcome: 'RESOLVED',
        contactId: 'salom',
        direction: 'GAVE',
        amount: 20000,
        settlements: [{ currency: 'UZS', amount: 20000, direction: 'GAVE' }],
      }),
    );

    expect(cmd.prefill.settlements).toHaveLength(1);
  });

  /** Oddiy gaplarda ro'yxat umuman bo'lmaydi - maydon bo'sh qolsin. */
  it('oddiy buyruqda ro\'yxat bo\'sh', () => {
    const cmd = resolveVoiceCommand(
      intent({ contactOutcome: 'RESOLVED', contactId: 'c1', direction: 'GAVE', amount: 50000 }),
    );

    expect(cmd.prefill.settlements).toBeUndefined();
  });
});
