import { applyAmountIntent, AmountFormState } from '../applyAmountIntent';
import type { VoiceIntent } from '../../api/voice';

/** Testda formatlash sodda: minglarni bo'shliq bilan ajratadi. */
const format = (raw: string) => Number(raw).toLocaleString('en-US').replace(/,/g, ' ');

const empty: AmountFormState = { amount: '', note: '' };

const intent = (over: Partial<VoiceIntent> = {}): VoiceIntent => ({
  text: 'taksiga',
  understood: true,
  ...over,
});

/**
 * Kunlik xarajat va gap to'yona formalari: summa + izoh.
 *
 * Qoida oldi-berdi formasidagi bilan BIR XIL bo'lishi shart — aks holda
 * bir bo'limda ishlagan narsa boshqasida boshqacha ishlab, ishonchni
 * yo'qotardi.
 */
describe('applyAmountIntent', () => {
  it("izoh har doim qo'yiladi", () => {
    expect(applyAmountIntent(intent({ text: 'nonga' }), empty, format).note).toBe('nonga');
  });

  it("bo'sh summa maydoni to'ldiriladi", () => {
    expect(applyAmountIntent(intent({ amount: 10000 }), empty, format).amount).toBe('10 000');
  });

  /** Qo'lda yozilgan summa ustidan yozilmaydi — xato sezilmay qoladi. */
  it("qo'lda yozilgan summa saqlanadi", () => {
    const typed = { ...empty, amount: '5 000' };
    expect(applyAmountIntent(intent({ amount: 10000 }), typed, format).amount).toBeUndefined();
  });

  it("summa aytilmasa maydon tegilmaydi", () => {
    expect(applyAmountIntent(intent({}), empty, format).amount).toBeUndefined();
    expect(applyAmountIntent(intent({ amount: null }), empty, format).amount).toBeUndefined();
  });

  it("nol, manfiy va buzuq summa rad etiladi", () => {
    for (const bad of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(applyAmountIntent(intent({ amount: bad }), empty, format).amount).toBeUndefined();
    }
  });

  /** Tushunilmagan bo'lsa ham aytilgan matn izohga tushadi. */
  it("tushunilmagan gapda ham matn saqlanadi", () => {
    const raw = intent({ text: 'bugun taksiga pul ketdi', understood: false });
    expect(applyAmountIntent(raw, empty, format).note).toBe('bugun taksiga pul ketdi');
  });
});
