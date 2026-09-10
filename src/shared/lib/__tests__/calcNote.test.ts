import { attachCalcExpression, hasOperation, splitCalcNote } from '../calcNote';

describe('hasOperation', () => {
  it('yakka son amal emas', () => {
    expect(hasOperation('5000')).toBe(false);
    expect(hasOperation('12.5')).toBe(false);
    // Manfiy son ham yakka son — oldidagi minus amal emas.
    expect(hasOperation('-300')).toBe(false);
  });

  it('amal belgisi bo\'lsa rost', () => {
    expect(hasOperation('10×2')).toBe(true);
    expect(hasOperation('10*2+55/99')).toBe(true);
    expect(hasOperation('100−40')).toBe(true);
    expect(hasOperation('500÷2')).toBe(true);
  });
});

describe('attachCalcExpression', () => {
  it('izoh va ifodani birga saqlaydi', () => {
    const saved = attachCalcExpression('Hejeje', '10×2+55÷99');
    expect(splitCalcNote(saved)).toEqual({ note: 'Hejeje', expression: '10×2+55÷99' });
  });

  it('izoh bo\'sh bo\'lsa ham ifoda saqlanadi', () => {
    const saved = attachCalcExpression('', '10×2');
    expect(splitCalcNote(saved)).toEqual({ note: '', expression: '10×2' });
  });

  it('amalsiz ifoda saqlanmaydi', () => {
    expect(attachCalcExpression('Hejeje', '5000')).toBe('Hejeje');
    expect(attachCalcExpression('Hejeje', '')).toBe('Hejeje');
    expect(attachCalcExpression('Hejeje', null)).toBe('Hejeje');
  });

  // Izoh ifoda tufayli backend chegarasida kesilib qolmasin.
  it('juda uzun ifoda saqlanmaydi', () => {
    const long = Array.from({ length: 40 }, (_, i) => String(i)).join('+');
    expect(long.length).toBeGreaterThan(60);
    expect(attachCalcExpression('Hejeje', long)).toBe('Hejeje');
  });
});

describe('splitCalcNote', () => {
  it('oddiy izohga tegmaydi', () => {
    expect(splitCalcNote('Qarz')).toEqual({ note: 'Qarz', expression: null });
  });

  it('bo\'sh qiymatlarni ko\'taradi', () => {
    expect(splitCalcNote(null)).toEqual({ note: '', expression: null });
    expect(splitCalcNote(undefined)).toEqual({ note: '', expression: null });
    expect(splitCalcNote('   ')).toEqual({ note: '', expression: null });
  });

  // Ko'p qatorli izoh: ifoda faqat OXIRIDAN olinadi, izoh butun qoladi.
  it('ko\'p qatorli izohni buzmaydi', () => {
    const saved = attachCalcExpression('Birinchi qator\nIkkinchi qator', '10×2');
    expect(splitCalcNote(saved)).toEqual({
      note: 'Birinchi qator\nIkkinchi qator',
      expression: '10×2',
    });
  });
});
