import { resolveGapCommand } from '../resolveGapCommand';
import type { VoiceGapMember, VoiceIntent } from '../../api/voice';

const member = (over: Partial<VoiceGapMember> = {}): VoiceGapMember => ({
  memberId: 'a-1',
  memberName: 'Bahtiyor aka',
  groupId: 'kassa-1',
  groupName: 'Mahalla gap',
  unitCode: 'UZS',
  unitLabel: "so'm",
  unitType: 'MONEY',
  ...over,
});

const intent = (over: Partial<VoiceIntent> = {}): VoiceIntent => ({
  text: 'gapga',
  understood: true,
  ...over,
});

describe('resolveGapCommand', () => {
  it('a\'zo aniq bo\'lsa o\'sha ekran ochiladi', () => {
    const cmd = resolveGapCommand(
      intent({
        gapOutcome: 'RESOLVED',
        gapMember: member(),
        amount: 50000,
        direction: 'GAVE',
        currency: 'UZS',
      }),
    );

    expect(cmd.kind).toBe('OPEN_MEMBER');
    if (cmd.kind !== 'OPEN_MEMBER') return;

    // Kassa ham kerak: amal aynan qaysi kassada bajarilishi shundan bilinadi.
    expect(cmd.member.groupId).toBe('kassa-1');
    expect(cmd.prefill).toEqual({
      amount: 50000,
      direction: 'GAVE',
      currency: 'UZS',
      note: 'gapga',
    });
  });

  /**
   * Yo'nalish AYTILMASLIGI mumkin. Bu xato emas: a'zo ekranida "Oldim" va
   * "Berdim" tugmalari turadi, summa esa tugmani bosgach formaga tushadi.
   */
  it('yo\'nalishsiz ham a\'zo ekrani ochiladi', () => {
    const cmd = resolveGapCommand(
      intent({ gapOutcome: 'RESOLVED', gapMember: member(), amount: 50000 }),
    );

    expect(cmd.kind).toBe('OPEN_MEMBER');
    expect(cmd.prefill.direction).toBeUndefined();
    expect(cmd.prefill.amount).toBe(50000);
  });

  /**
   * ENG XAVFLI HOLAT: bir nechta a'zo mos keldi. Birinchisi olinmaydi -
   * pul begona odamning hisobiga tushsa, uni keyin topish qiyin.
   */
  it('bir nechta a\'zoda tanlov odamga qoladi', () => {
    const cmd = resolveGapCommand(
      intent({
        gapOutcome: 'AMBIGUOUS',
        gapOptions: [member(), member({ memberId: 'a-2', groupId: 'kassa-2', groupName: 'Ish gap' })],
        amount: 50000,
      }),
    );

    expect(cmd.kind).toBe('CHOOSE_MEMBER');
    if (cmd.kind !== 'CHOOSE_MEMBER') return;
    expect(cmd.options).toHaveLength(2);
  });

  /** Noaniq, lekin ro'yxat bo'sh - tanlatadigan narsa yo'q. */
  it('bo\'sh ro\'yxatli noaniqlik hech kimni ochmaydi', () => {
    const cmd = resolveGapCommand(intent({ gapOutcome: 'AMBIGUOUS', gapOptions: [] }));

    expect(cmd.kind).toBe('NO_MEMBER');
  });

  it('topilmagan a\'zoda summa saqlanadi', () => {
    const cmd = resolveGapCommand(intent({ gapOutcome: 'NOT_FOUND', amount: 50000 }));

    expect(cmd.kind).toBe('NO_MEMBER');
    expect(cmd.prefill.amount).toBe(50000);
  });

  /** RESOLVED deyilgan-u, a'zo kelmagan: ishonib ochib bo'lmaydi. */
  it('a\'zosiz RESOLVED ham ochilmaydi', () => {
    const cmd = resolveGapCommand(intent({ gapOutcome: 'RESOLVED' }));

    expect(cmd.kind).toBe('NO_MEMBER');
  });

  /** Manfiy yoki nol summa formaga tushmasin. */
  it('yaroqsiz summa tashlanadi', () => {
    const cmd = resolveGapCommand(
      intent({ gapOutcome: 'RESOLVED', gapMember: member(), amount: -5 }),
    );

    expect(cmd.prefill.amount).toBeUndefined();
  });
});
