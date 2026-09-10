import { hasOperation, resolveCalcNote, splitLegacyCalcNote } from '../calcNote';

/** Eski (izoh ichiga yozilgan) ko'rinishni testda qayta yasash. */
const legacy = (note: string, expression: string) =>
  note ? `${note}\n⟪=${expression}⟫` : `⟪=${expression}⟫`;

describe('hasOperation', () => {
  it('yakka son amal emas', () => {
    expect(hasOperation('5000')).toBe(false);
    expect(hasOperation('12.5')).toBe(false);
    // Manfiy son ham yakka son — oldidagi minus amal emas.
    expect(hasOperation('-300')).toBe(false);
  });

  it("amal belgisi bo'lsa rost", () => {
    expect(hasOperation('10×2')).toBe(true);
    expect(hasOperation('10*2+55/99')).toBe(true);
    expect(hasOperation('100−40')).toBe(true);
    expect(hasOperation('500÷2')).toBe(true);
  });
});

describe('resolveCalcNote', () => {
  // Asosiy yo'l: ifoda ALOHIDA ustundan keladi, izoh toza qoladi.
  it('alohida ustundagi ifodani oladi', () => {
    expect(resolveCalcNote('Hejeje', '10×2+55÷99')).toEqual({
      note: 'Hejeje',
      expression: '10×2+55÷99',
    });
  });

  it("kalkulyatorsiz yozuvda ifoda bo'lmaydi", () => {
    expect(resolveCalcNote('Oddiy izoh', null)).toEqual({
      note: 'Oddiy izoh',
      expression: null,
    });
    expect(resolveCalcNote('Oddiy izoh', '   ')).toEqual({
      note: 'Oddiy izoh',
      expression: null,
    });
  });

  it("izoh bo'sh bo'lsa ham ifoda ko'rinadi", () => {
    expect(resolveCalcNote('', '300×4')).toEqual({ note: '', expression: '300×4' });
    expect(resolveCalcNote(null, '300×4')).toEqual({ note: '', expression: '300×4' });
  });

  // Ustun paydo bo'lishidan oldin yaratilgan yozuvlar bazada qolgan —
  // ular ham to'g'ri ko'rinishi kerak, xizmat belgilarisiz.
  it('eski yozuvda ifodani izoh ichidan oladi', () => {
    expect(resolveCalcNote(legacy('Hejeje', '10×2'), undefined)).toEqual({
      note: 'Hejeje',
      expression: '10×2',
    });
  });

  it('ustun ustunroq: ikkalasi bo\'lsa ustundagisi olinadi', () => {
    expect(resolveCalcNote(legacy('Hejeje', '1+1'), '10×2')).toEqual({
      note: 'Hejeje',
      expression: '10×2',
    });
  });
});

describe('splitLegacyCalcNote', () => {
  it('oddiy izohga tegmaydi', () => {
    expect(splitLegacyCalcNote('Qarz')).toEqual({ note: 'Qarz', expression: null });
  });

  it("bo'sh qiymatlarni ko'taradi", () => {
    expect(splitLegacyCalcNote(null)).toEqual({ note: '', expression: null });
    expect(splitLegacyCalcNote(undefined)).toEqual({ note: '', expression: null });
    expect(splitLegacyCalcNote('   ')).toEqual({ note: '', expression: null });
  });

  // Ko'p qatorli izoh: ifoda faqat OXIRIDAN olinadi, izoh butun qoladi.
  it("ko'p qatorli izohni buzmaydi", () => {
    expect(splitLegacyCalcNote(legacy('Birinchi qator\nIkkinchi qator', '10×2'))).toEqual({
      note: 'Birinchi qator\nIkkinchi qator',
      expression: '10×2',
    });
  });
});
