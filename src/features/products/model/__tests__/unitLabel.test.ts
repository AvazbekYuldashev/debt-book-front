import { formatUnitLabel, isSingleUnit } from '../unitLabel';

describe('isSingleUnit', () => {
  it('1 va uning ekvivalentlari yakka birlik', () => {
    expect(isSingleUnit(1)).toBe(true);
    expect(isSingleUnit('1')).toBe(true);
    expect(isSingleUnit('1.0')).toBe(true);
  });

  it("o'lcham yo'q bo'lsa ham yakka birlik", () => {
    // Eski yozuvlar: ustun keyin qo'shilgan, qiymat kelmasligi mumkin.
    expect(isSingleUnit(undefined)).toBe(true);
    expect(isSingleUnit(null)).toBe(true);
    expect(isSingleUnit('')).toBe(true);
  });

  it('buzuq yoki manfiy qiymat yakka birlik deb qaraladi', () => {
    expect(isSingleUnit('salom')).toBe(true);
    expect(isSingleUnit(0)).toBe(true);
    expect(isSingleUnit(-2)).toBe(true);
  });

  it('1 dan farqli qiymat yakka emas', () => {
    expect(isSingleUnit(0.5)).toBe(false);
    expect(isSingleUnit(1.5)).toBe(false);
    expect(isSingleUnit('0,5')).toBe(false);
  });
});

describe('formatUnitLabel', () => {
  it('1 bo\'lsa miqdor YOZILMAYDI', () => {
    expect(formatUnitLabel(1, 'kg')).toBe('kg');
    expect(formatUnitLabel(undefined, 'litr')).toBe('litr');
    expect(formatUnitLabel(null, 'porsiya')).toBe('porsiya');
  });

  it('kasr o\'lcham birlik oldida turadi', () => {
    expect(formatUnitLabel(0.5, 'litr')).toBe('0.5 litr');
    expect(formatUnitLabel(1.5, 'kg')).toBe('1.5 kg');
    expect(formatUnitLabel(0.5, 'porsiya')).toBe('0.5 porsiya');
  });

  it('butun sonlar ham ko\'rsatiladi (1 dan tashqari)', () => {
    expect(formatUnitLabel(2, 'quti')).toBe('2 quti');
    expect(formatUnitLabel(10, 'dona')).toBe('10 dona');
  });

  it('vergulli kiritish ham tushuniladi', () => {
    expect(formatUnitLabel('0,5', 'litr')).toBe('0.5 litr');
  });

  it('buzuq qiymatda birlikning o\'zi qaytadi', () => {
    expect(formatUnitLabel('salom', 'kg')).toBe('kg');
    expect(formatUnitLabel(0, 'kg')).toBe('kg');
  });
});
