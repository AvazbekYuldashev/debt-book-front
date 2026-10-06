import {
  KEEP_THEME_CONTRAST,
  contrastRatio,
  parseColor,
  readableTheme,
  textContrastOnPhoto,
} from '../photoTone';

/** Skrinshotdagidek to'q tosh rasm. */
const DARK_PHOTO = { r: 58, g: 68, b: 84 };
/** Och, deyarli oq rasm (qor, qum, oq devor). */
const BRIGHT_PHOTO = { r: 236, g: 234, b: 228 };

describe('parseColor', () => {
  it('hex va rgba satrlarini oqiydi', () => {
    expect(parseColor('#101C36')).toEqual({ r: 16, g: 28, b: 54, a: 1 });
    expect(parseColor('rgba(255, 255, 255, 0.92)')).toEqual({ r: 255, g: 255, b: 255, a: 0.92 });
  });

  it('notanish satr null', () => {
    expect(parseColor('transparent')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('qora va oq - 21', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 0);
  });
});

/**
 * "Ko'p" shaffoflikda sirt matnga fon bermaydi - matn rasmning o'zida
 * turadi. Shu sababli matn rangi mavzudan emas, RASMDAN kelishi kerak.
 */
describe('readableTheme', () => {
  it("yorug' mavzuda to'q rasm ustida to'q matn o'qilmaydi", () => {
    expect(textContrastOnPhoto(DARK_PHOTO, 'light', 0, 'clear')).toBeLessThan(KEEP_THEME_CONTRAST);
  });

  it("yorug' mavzu + to'q rasm + Ko'p -> qorong'i mavzu ko'rsatiladi", () => {
    expect(readableTheme('light', DARK_PHOTO, 0, 'clear')).toBe('dark');
    expect(textContrastOnPhoto(DARK_PHOTO, 'dark', 0, 'clear')).toBeGreaterThanOrEqual(
      KEEP_THEME_CONTRAST,
    );
  });

  /** Standart parda (0.15) ham to'q rasmni yetarlicha oqartirmaydi. */
  it('standart pardada ham almashadi', () => {
    expect(readableTheme('light', DARK_PHOTO, 0.15, 'clear')).toBe('dark');
  });

  it("qorong'i mavzu + och rasm + Ko'p -> yorug' mavzu ko'rsatiladi", () => {
    expect(readableTheme('dark', BRIGHT_PHOTO, 0, 'clear')).toBe('light');
  });

  /** Tanlov ustun: mavzu o'qilsa, tegilmaydi. */
  it("mos rasmda foydalanuvchi tanlovi qoladi", () => {
    expect(readableTheme('light', BRIGHT_PHOTO, 0, 'clear')).toBe('light');
    expect(readableTheme('dark', DARK_PHOTO, 0, 'clear')).toBe('dark');
  });

  /** "O'rta" va "Kam" da sirtning o'zi matnga fon beradi. */
  it("qalin sirtda yorug' mavzu to'q rasmda ham qoladi", () => {
    expect(readableTheme('light', DARK_PHOTO, 0, 'medium')).toBe('light');
    expect(readableTheme('light', DARK_PHOTO, 0, 'solid')).toBe('light');
  });

  /** Kuchli parda rasmni o'zi oqartiradi - almashtirish shart emas. */
  it("kuchli pardada yorug' mavzu qoladi", () => {
    expect(readableTheme('light', DARK_PHOTO, 0.7, 'clear')).toBe('light');
  });
});
