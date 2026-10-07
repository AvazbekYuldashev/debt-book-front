import { resolveExpenseCommand } from '../resolveExpenseCommand';
import type { VoiceIntent } from '../../api/voice';

const CATEGORIES = [
  { id: 'c1', name: 'Oziq-ovqat' },
  { id: 'c2', name: 'Transport' },
];

const intent = (over: Partial<VoiceIntent>): VoiceIntent => ({
  text: 'nonga',
  understood: true,
  amount: 50000,
  ...over,
});

/**
 * Ovozdan xarajat yozishda eng qimmat xato - PULNI NOTO'G'RI
 * KATEGORIYAGA yozib qo'yish. Shuning uchun taxmin qilinmaydi: aniq
 * topilsa ochiladi, topilmasa odamdan so'raladi.
 */
describe('resolveExpenseCommand', () => {
  it('server topgan kategoriya ochiladi', () => {
    const command = resolveExpenseCommand(intent({ categoryId: 'c1' }), CATEGORIES);

    expect(command).toEqual({
      kind: 'OPEN_CATEGORY',
      categoryId: 'c1',
      categoryName: 'Oziq-ovqat',
      amount: 50000,
      description: 'nonga',
      calcNote: null,
    });
  });

  /** Id yo'q bo'lsa nom bo'yicha - lekin AYNAN mos kelganda. */
  it('nom aynan mos kelsa topiladi', () => {
    const command = resolveExpenseCommand(
      intent({ categoryName: '  oziq-ovqat ' }),
      CATEGORIES,
    );

    expect(command).toMatchObject({ kind: 'OPEN_CATEGORY', categoryId: 'c1' });
  });

  /**
   * TAXMIN YO'Q: "oziq" so'zi "Oziq-ovqat" ga o'xshasa ham o'zi tanlanmaydi.
   * Noto'g'ri kategoriyaga yozilgan pulni topish qiyin.
   */
  it('oxshash nom taxmin qilinmaydi', () => {
    const command = resolveExpenseCommand(intent({ categoryName: 'oziq' }), CATEGORIES);

    expect(command.kind).toBe('PICK_CATEGORY');
  });

  /** Kategoriya o'chirilgan bo'lishi mumkin - id ro'yxatda yo'q. */
  it('yoq boigan id uchun soraladi', () => {
    const command = resolveExpenseCommand(intent({ categoryId: 'yoq' }), CATEGORIES);

    expect(command.kind).toBe('PICK_CATEGORY');
  });

  it('kategoriya umuman aytilmasa soraladi', () => {
    const command = resolveExpenseCommand(intent({}), CATEGORIES);

    expect(command).toEqual({
      kind: 'PICK_CATEGORY',
      amount: 50000,
      description: 'nonga',
      calcNote: null,
    });
  });

  /** Summasiz xarajat yo'q. */
  it('summa yoq yoki nol bolsa tushunilmagan', () => {
    expect(resolveExpenseCommand(intent({ amount: null }), CATEGORIES).kind).toBe('NOT_UNDERSTOOD');
    expect(resolveExpenseCommand(intent({ amount: 0 }), CATEGORIES).kind).toBe('NOT_UNDERSTOOD');
    expect(resolveExpenseCommand(intent({ amount: -5 }), CATEGORIES).kind).toBe('NOT_UNDERSTOOD');
  });

  it('tushunilmagan gap otkazilmaydi', () => {
    expect(resolveExpenseCommand(intent({ understood: false }), CATEGORIES).kind)
      .toBe('NOT_UNDERSTOOD');
  });

  /** Kalkulyator ifodasi ("7000×2") formaga o'tadi. */
  it('hisob izohi saqlanadi', () => {
    const command = resolveExpenseCommand(
      intent({ categoryId: 'c2', calcNote: '7000×2' }),
      CATEGORIES,
    );

    expect(command).toMatchObject({ kind: 'OPEN_CATEGORY', calcNote: '7000×2' });
  });
});
