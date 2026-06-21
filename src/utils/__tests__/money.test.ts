import { extractMoneyTotals, formatMoney, normalizeMoney } from '../money';

describe('extractMoneyTotals', () => {
  it('to‘g‘ridan-to‘g‘ri maydonlardan o‘qiydi', () => {
    expect(extractMoneyTotals({ totalDebt: 100, totalCredit: 250 })).toEqual({
      totalDebt: 100,
      totalCredit: 250,
      balance: 150,
    });
  });
  it('balans payload bo‘lmasa, credit - debt hisoblaydi', () => {
    const r = extractMoneyTotals({ debt: 300, credit: 100 } as any);
    expect(r.balance).toBe(-200);
  });
  it('null -> hammasi 0', () => {
    expect(extractMoneyTotals(null)).toEqual({ totalDebt: 0, totalCredit: 0, balance: 0 });
  });
  it('string raqamlarni ham parse qiladi', () => {
    const r = extractMoneyTotals({ totalDebt: '50', totalCredit: '75' } as any);
    expect(r).toEqual({ totalDebt: 50, totalCredit: 75, balance: 25 });
  });
});

describe('normalizeMoney', () => {
  it('amount string -> number', () => {
    const out = normalizeMoney({ id: '1', amount: '1234', description: '' } as any);
    expect(out.amount).toBe(1234);
  });
});

describe('formatMoney', () => {
  it('minglarni ajratib so‘m qo‘shadi', () => {
    // ru-RU locale uchun ajratkich (NBSP yoki space) muhim emas — raqam va birlikni tekshiramiz.
    const out = formatMoney(1234567);
    expect(out.replace(/\s| /g, '')).toBe("1234567so'm");
  });
});
