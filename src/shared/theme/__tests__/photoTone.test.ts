import {
  KEEP_THEME_SHARE,
  PHOTO_SCRIM_END,
  contrastRatio,
  parseColor,
  readableShare,
  readableTheme,
  scrimAt,
  type PhotoSample,
  type Rgb,
} from '../photoTone';

const ROWS = 24;
const COLS = 12;

/** Butun ekran bir xil rangli rasm. */
const uniform = (color: Rgb): PhotoSample => ({
  rows: ROWS,
  cols: COLS,
  cells: Array.from({ length: ROWS * COLS }, () => ({ ...color, a: 1 })),
});

/** Yuqori `topShare` qismi bir rang, qolgani boshqa. */
const split = (top: Rgb, bottom: Rgb, topShare: number): PhotoSample => ({
  rows: ROWS,
  cols: COLS,
  cells: Array.from({ length: ROWS * COLS }, (_, i) => {
    const row = Math.floor(i / COLS);
    return { ...((row + 0.5) / ROWS < topShare ? top : bottom), a: 1 };
  }),
});

/** Skrinshotdagidek to'q tosh rasm. */
const DARK = { r: 58, g: 68, b: 84 };
/** Och, deyarli oq rasm (qor, qum, oq devor). */
const BRIGHT = { r: 236, g: 234, b: 228 };
/** Ikkinchi skrinshot: tepasi och ko'kish tosh, pasti to'q. */
const BRIGHT_TOP = { r: 150, g: 170, b: 195 };
const DARK_BOTTOM = { r: 45, g: 55, b: 70 };

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

/** Yuqori parda sarlavhalarni o'qitadi va pastga qarab so'nadi. */
describe('scrimAt', () => {
  it('tepada eng qalin, chegaradan keyin yoq', () => {
    expect(scrimAt(0)).toBeGreaterThan(0.8);
    expect(scrimAt(PHOTO_SCRIM_END / 2)).toBeLessThan(scrimAt(0));
    expect(scrimAt(PHOTO_SCRIM_END)).toBe(0);
    expect(scrimAt(0.9)).toBe(0);
  });
});

/**
 * "Ko'p" shaffoflikda sirt matnga fon bermaydi - matn rasmning o'zida
 * turadi. Shu sababli matn rangi mavzudan emas, RASMDAN kelishi kerak.
 */
describe('readableTheme', () => {
  it("yorug' mavzuda to'q rasm ustida to'q matn deyarli hech qayerda o'qilmaydi", () => {
    // Faqat yuqori parda ostidagi tasma o'qiladi.
    expect(readableShare(uniform(DARK), 'light', 0, 'clear')).toBeLessThan(0.4);
    expect(readableShare(uniform(DARK), 'dark', 0, 'clear')).toBe(1);
  });

  it("yorug' mavzu + to'q rasm + Ko'p -> qorong'i mavzu", () => {
    expect(readableTheme('light', uniform(DARK), 0, 'clear')).toBe('dark');
    expect(readableTheme('light', uniform(DARK), 0.15, 'clear')).toBe('dark');
  });

  /**
   * O'rtacha rang bu rasmda ALDAYDI: standart pardada (0.15) o'rtachaga
   * yorug' mavzu o'tib ketardi, ro'yxat esa to'q pastki qismda turadi.
   */
  it("tepasi och, pasti to'q rasmda ham almashadi", () => {
    const photo = split(BRIGHT_TOP, DARK_BOTTOM, 0.4);
    expect(readableShare(photo, 'light', 0.15, 'clear')).toBeLessThan(KEEP_THEME_SHARE);
    expect(readableTheme('light', photo, 0.15, 'clear')).toBe('dark');
  });

  it("qorong'i mavzu + och rasm + Ko'p -> yorug' mavzu", () => {
    expect(readableTheme('dark', uniform(BRIGHT), 0, 'clear')).toBe('light');
  });

  /** Tanlov ustun: mavzu o'qilsa, tegilmaydi. */
  it('mos rasmda foydalanuvchi tanlovi qoladi', () => {
    expect(readableTheme('light', uniform(BRIGHT), 0, 'clear')).toBe('light');
    expect(readableTheme('dark', uniform(DARK), 0, 'clear')).toBe('dark');
  });

  /**
   * "O'rta" da oq sirt to'q rasm ustida kulrang bo'lib qoladi: asosiy matn
   * o'qiladi, kulrang yorliqlar esa yo'qolardi (skrinshot: Sozlamalar).
   */
  it("O'rta + to'q rasm -> qorong'i mavzu (kulrang matn uchun)", () => {
    expect(readableTheme('light', uniform(DARK), 0, 'medium')).toBe('dark');
  });

  /** "Kam" da sirt deyarli to'liq oq karta - yorug' mavzu qoladi. */
  it("Kam da yorug' mavzu to'q rasmda ham qoladi", () => {
    expect(readableTheme('light', uniform(DARK), 0, 'solid')).toBe('light');
  });

  /** O'rtacha yorqin rasmda "O'rta" da yorug' mavzu o'qiladi va qoladi. */
  it("o'rtacha rasmda O'rta da yorug' mavzu qoladi", () => {
    expect(readableTheme('light', uniform({ r: 140, g: 140, b: 140 }), 0, 'medium')).toBe('light');
  });

  /** Kuchli parda rasmni o'zi oqartiradi - almashtirish shart emas. */
  it("kuchli pardada yorug' mavzu qoladi", () => {
    expect(readableTheme('light', uniform(DARK), 0.7, 'clear')).toBe('light');
  });

  /** Rasm qoplamagan katakda (shaffof PNG) mavzu foni ko'rinadi. */
  it("shaffof katak mavzu foni sifatida o'qiladi", () => {
    const empty: PhotoSample = {
      rows: 1,
      cols: 1,
      cells: [{ r: 0, g: 0, b: 0, a: 0 }],
    };
    expect(readableShare(empty, 'light', 0, 'clear')).toBe(1);
  });
});
