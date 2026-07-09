import {
  convertAmount,
  formatCurrency,
  netInBase,
  parseCurrencyAmounts,
  sumInBase,
} from '../currency';
import { CurrencyRatesDTO } from '../../types/money';

const rates: CurrencyRatesDTO = {
  base: 'UZS',
  rates: { UZS: 1, USD: 12000, RUB: 150 },
};

describe('convertAmount', () => {
  it('bir xil valyuta -> o‘zgarishsiz', () => {
    expect(convertAmount(100, 'USD', 'USD', rates)).toBe(100);
  });
  it('USD -> UZS', () => {
    expect(convertAmount(10, 'USD', 'UZS', rates)).toBe(120000);
  });
  it('UZS -> USD', () => {
    expect(convertAmount(120000, 'UZS', 'USD', rates)).toBe(10);
  });
  it('kurs topilmasa -> fallback (o‘zgarishsiz)', () => {
    expect(convertAmount(10, 'USD', 'UZS', null)).toBe(10);
  });
});

describe('parseCurrencyAmounts', () => {
  it('string qiymatlarni parse qiladi va noma‘lum kalitni UZS ga qo‘shadi', () => {
    const r = parseCurrencyAmounts({ USD: '100', UZS: '500000', EUR: '5' });
    expect(r.USD).toBe(100);
    expect(r.UZS).toBe(500005);
  });
});

describe('sumInBase / netInBase', () => {
  it('turli valyutalarni asosiy valyutaga jamlaydi', () => {
    // 1 USD (12000) + 100000 UZS = 112000 UZS
    expect(sumInBase({ USD: 1, UZS: 100000 }, 'UZS', rates)).toBe(112000);
  });
  it('credit - debt sof balans (UZS)', () => {
    // credit: 2 USD = 24000; debt: 12000 UZS -> net 12000
    expect(netInBase({ USD: 2 }, { UZS: 12000 }, 'UZS', rates)).toBe(12000);
  });
});

describe('formatCurrency', () => {
  it('so‘m belgisi bilan', () => {
    expect(formatCurrency(1234567, 'UZS').replace(/\s| /g, '')).toBe("1234567so'm");
  });
  it('dollar belgisi bilan', () => {
    expect(formatCurrency(100, 'USD').replace(/\s| /g, '')).toBe('100$');
  });
});
