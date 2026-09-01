import { extractMoneyTotals, formatAmountInput, formatMoney, normalizeMoney, parseAmountInput } from '../money';

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

describe('formatAmountInput', () => {
  it('har 3 raqamda bo‘sh joy qo‘yadi', () => {
    expect(formatAmountInput('1234567')).toBe('1 234 567');
  });
  it('raqam bo‘lmagan belgilarni tashlab yuboradi', () => {
    expect(formatAmountInput('12a345')).toBe('12 345');
  });
  it('bo‘sh kiritish -> bo‘sh satr', () => {
    expect(formatAmountInput('abc')).toBe('');
  });

  // Kalkulyator natijasi shu maydonga tushadi. Ilgari nuqta yo‘qolib,
  // summa o‘n yoki yuz barobar oshib ketardi.
  it('kasr qismini SAQLAYDI', () => {
    expect(formatAmountInput('1500.5')).toBe('1 500.5');
    expect(formatAmountInput('10.25')).toBe('10.25');
  });
  it('vergulni nuqta deb qabul qiladi', () => {
    expect(formatAmountInput('12,5')).toBe('12.5');
  });
  it('kasr qismi ikki xonagacha — pulda undan ortig‘i ma’nosiz', () => {
    expect(formatAmountInput('1.23456')).toBe('1.23');
  });
  it('ikkinchi nuqtani e’tiborsiz qoldiradi', () => {
    expect(formatAmountInput('1.2.3')).toBe('1.23');
  });
  it('kasrli qiymat o‘qilganda ham o‘zgarmaydi (borib-kelish)', () => {
    expect(parseAmountInput(formatAmountInput('1500.5'))).toBe(1500.5);
  });
});

describe('parseAmountInput', () => {
  it('formatlangan summani songa o‘giradi', () => {
    expect(parseAmountInput('1 234 567')).toBe(1234567);
  });
  it('vergulni kasr ajratkich sifatida qabul qiladi', () => {
    expect(parseAmountInput('12,5')).toBe(12.5);
  });
  it('bo‘sh yoki nol -> null', () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('0')).toBeNull();
  });
  it('noto‘g‘ri matn -> null', () => {
    expect(parseAmountInput('abc')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('minglarni ajratib so‘m qo‘shadi', () => {
    // ru-RU locale uchun ajratkich (NBSP yoki space) muhim emas — raqam va birlikni tekshiramiz.
    const out = formatMoney(1234567);
    expect(out.replace(/\s| /g, '')).toBe("1234567so'm");
  });
});
