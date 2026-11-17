import {
  canConvertAll,
  convertAmount,
  formatCurrency,
  netByCurrency,
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

/**
 * UMUMIY BALANS kursda jamlanadi, lekin KURS BO'LMASA jamlanmasligi
 * kerak: `convertAmount` kurssiz summani o'zgartirmay qaytaradi va
 * 5 000 dollar 5 000 so'm bo'lib qo'shilib ketardi.
 */
describe('canConvertAll', () => {
  it('kurs bor — jamlash mumkin', () => {
    expect(canConvertAll({ USD: 5000, UZS: 100 }, 'UZS', rates)).toBe(true);
  });

  it("kurs umuman yo'q — jamlab bo'lmaydi", () => {
    expect(canConvertAll({ USD: 5000 }, 'UZS', null)).toBe(false);
  });

  it("kerakli valyuta kursi yetishmasa — jamlab bo'lmaydi", () => {
    const partial: CurrencyRatesDTO = { base: 'UZS', rates: { UZS: 1, USD: 12000 } };
    expect(canConvertAll({ RUB: 128123 }, 'UZS', partial)).toBe(false);
  });

  it("faqat asosiy valyuta bo'lsa kurs KERAK EMAS", () => {
    expect(canConvertAll({ UZS: 500 }, 'UZS', null)).toBe(true);
    // Nolga teng qatorlar ham to'siq bo'lmaydi.
    expect(canConvertAll({ UZS: 500, USD: 0 }, 'UZS', null)).toBe(true);
  });

  /** Egasining ekrani: so'm + dollar + rubl bitta raqamga yig'iladi. */
  it("uch valyutali balans Markaziy bank kursida jamlanadi", () => {
    const debt = { UZS: 16_271_610, USD: 5_000.5, RUB: 128_123 };
    const credit = { UZS: 416_331, USD: 54_955 };

    expect(canConvertAll(debt, 'UZS', rates)).toBe(true);
    expect(canConvertAll(credit, 'UZS', rates)).toBe(true);
    // (416331 + 54955x12000) - (16271610 + 5000.5x12000 + 128123x150)
    expect(netInBase(credit, debt, 'UZS', rates)).toBe(
      416_331 + 54_955 * 12_000 - (16_271_610 + 5_000.5 * 12_000 + 128_123 * 150),
    );
  });
});

describe('netByCurrency', () => {
  it('har valyuta alohida hisoblanadi, kurs aralashmaydi', () => {
    const r = netByCurrency({ UZS: 500000, USD: 100 }, { UZS: 200000, USD: 30 });
    expect(r).toEqual([
      { currency: 'UZS', amount: 300000 },
      { currency: 'USD', amount: 70 },
    ]);
  });
  it('bir valyutada haq, boshqasida qarz bo‘lishi mumkin', () => {
    const r = netByCurrency({ USD: 50 }, { UZS: 100000 });
    expect(r).toEqual([
      { currency: 'UZS', amount: -100000 },
      { currency: 'USD', amount: 50 },
    ]);
  });
  it('nolga teng valyutalar chiqmaydi', () => {
    expect(netByCurrency({ UZS: 1000 }, { UZS: 1000 })).toEqual([]);
    expect(netByCurrency({}, {})).toEqual([]);
  });
});

describe('formatCurrency', () => {
  const strip = (s: string) => s.replace(/\s| /g, '');

  it('so‘m — butun son', () => {
    expect(strip(formatCurrency(1234567, 'UZS'))).toBe("1234567so'm");
  });
  it('so‘m — kasr yaxlitlanadi', () => {
    expect(strip(formatCurrency(20000.7, 'UZS'))).toBe("20001so'm");
  });
  it('dollar — butun', () => {
    expect(strip(formatCurrency(100, 'USD'))).toBe('100$');
  });
  it('dollar — kasr (ortiqcha nol tushadi)', () => {
    expect(strip(formatCurrency(12.3, 'USD'))).toBe('12.3$');
    expect(strip(formatCurrency(12.05, 'USD'))).toBe('12.05$');
  });
  it('rubl — kasr', () => {
    expect(strip(formatCurrency(550.3, 'RUB'))).toBe('550.3₽');
  });
  it('manfiy qiymat', () => {
    expect(strip(formatCurrency(-12.5, 'USD'))).toBe('-12.5$');
  });
});
