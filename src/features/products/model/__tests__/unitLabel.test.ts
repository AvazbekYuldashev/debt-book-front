import { formatUnitLabel, normalizeAmount } from '../unitLabel';

describe('normalizeAmount', () => {
  it('haqiqiy qiymatni o\'zgartirmaydi', () => {
    expect(normalizeAmount(0.5)).toBe(0.5);
    expect(normalizeAmount(1.5)).toBe(1.5);
    expect(normalizeAmount(2)).toBe(2);
  });

  it("o'lcham yo'q bo'lsa 1", () => {
    // Eski yozuvlar: ustun keyin qo'shilgan, qiymat kelmasligi mumkin.
    expect(normalizeAmount(undefined)).toBe(1);
    expect(normalizeAmount(null)).toBe(1);
    expect(normalizeAmount('')).toBe(1);
  });

  it('buzuq, nol yoki manfiy qiymat 1 ga tushadi', () => {
    expect(normalizeAmount('salom')).toBe(1);
    expect(normalizeAmount(0)).toBe(1);
    expect(normalizeAmount(-2)).toBe(1);
  });

  it('vergulli satr ham tushuniladi', () => {
    expect(normalizeAmount('0,5')).toBe(0.5);
  });
});

describe('formatUnitLabel', () => {
  /**
   * Miqdor HAR DOIM ko'rinadi. Ilgari 1 yashirilardi ("/ litr"), lekin
   * narxnomaga qaragan odam "qancha pulga qancha" degan savolga darhol
   * javob olishi kerak.
   */
  it('1 ham yoziladi', () => {
    expect(formatUnitLabel(1, 'litr')).toBe('1 litr');
    expect(formatUnitLabel(1, 'dona')).toBe('1 dona');
  });

  it("o'lcham yo'q bo'lsa ham 1 deb yoziladi", () => {
    expect(formatUnitLabel(undefined, 'litr')).toBe('1 litr');
    expect(formatUnitLabel(null, 'kg')).toBe('1 kg');
  });

  it('kasr o\'lcham birlik oldida turadi', () => {
    expect(formatUnitLabel(0.5, 'litr')).toBe('0.5 litr');
    expect(formatUnitLabel(1.5, 'kg')).toBe('1.5 kg');
    expect(formatUnitLabel(0.5, 'porsiya')).toBe('0.5 porsiya');
  });

  it('butun sonlar ham ko\'rsatiladi', () => {
    expect(formatUnitLabel(2, 'quti')).toBe('2 quti');
    expect(formatUnitLabel(10, 'dona')).toBe('10 dona');
  });

  it('vergulli kiritish ham tushuniladi', () => {
    expect(formatUnitLabel('0,5', 'litr')).toBe('0.5 litr');
  });

  it('buzuq qiymatda 1 deb ko\'rsatiladi', () => {
    expect(formatUnitLabel('salom', 'kg')).toBe('1 kg');
    expect(formatUnitLabel(0, 'kg')).toBe('1 kg');
  });
});
