import {
  contrastRatio,
  parseColor,
  photoTheme,
  readableShare,
  type PhotoSample,
  type Rgb,
} from '../photoTone';
import { TRANSPARENCY_LEVELS } from '../transparency';

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

/**
 * Har darajada, har ikki mavzuda, HAR QANDAY rasmda (u keskin ham
 * bo'lishi mumkin - "Xiralik: Yo'q") sirt ichidagi matn o'qiladi -
 * muzlatishsiz ham (telefonda backdrop-filter yo'q).
 */
describe('shaffoflik jadvallari', () => {
  const PHOTOS: Record<string, PhotoSample> = {
    "qop-qora": uniform({ r: 0, g: 0, b: 0 }),
    oppoq: uniform({ r: 255, g: 255, b: 255 }),
    "to'q tosh": uniform(DARK),
    och: uniform(BRIGHT),
    "tepasi och, pasti to'q": split(BRIGHT_TOP, DARK_BOTTOM, 0.4),
  };

  for (const theme of ['light', 'dark'] as const) {
    for (const { id: level } of TRANSPARENCY_LEVELS) {
      it(`${theme} / ${level}: hamma rasmda hamma joyda o'qiladi`, () => {
        for (const [name, photo] of Object.entries(PHOTOS)) {
          expect([name, readableShare(photo, theme, level)]).toEqual([name, 1]);
        }
      });
    }
  }

  /** Rasm qoplamagan katakda (shaffof PNG) mavzu foni ko'rinadi. */
  it("shaffof katak mavzu foni sifatida o'qiladi", () => {
    const empty: PhotoSample = {
      rows: 1,
      cols: 1,
      cells: [{ r: 0, g: 0, b: 0, a: 0 }],
    };
    expect(readableShare(empty, 'light', 'clear')).toBe(1);
  });
});

/**
 * Yozuv rangi FONGA ergashadi: yorug' rejimda fon to'q bo'lsa yozuvlar oq
 * (qorong'i ko'rinish), qorong'i rejimda fon och bo'lsa - to'q.
 */
describe('photoTheme', () => {
  it("yorug' rejim + to'q fon -> oq yozuv", () => {
    expect(photoTheme('light', uniform(DARK))).toBe('dark');
    expect(photoTheme('light', uniform({ r: 0, g: 0, b: 0 }))).toBe('dark');
  });

  it("yorug' rejim + och fon -> o'z holicha", () => {
    expect(photoTheme('light', uniform(BRIGHT))).toBe('light');
  });

  /** O'rtacha fonda tanlov hal qiladi - har kulrangda sakramaydi. */
  it("o'rtacha fonda tanlangan rejim qoladi", () => {
    const mid = uniform({ r: 128, g: 128, b: 128 });
    expect(photoTheme('light', mid)).toBe('light');
    expect(photoTheme('dark', mid)).toBe('dark');
  });

  it("qorong'i rejim + och fon -> to'q yozuv", () => {
    expect(photoTheme('dark', uniform(BRIGHT))).toBe('light');
    expect(photoTheme('dark', uniform(DARK))).toBe('dark');
  });


  /**
   * Mediana: to'q rasmdagi yorqin tasma va nuqtalar (skrinshotdagi neon
   * chiziq) fonni "och" qilib qo'ymaydi.
   */
  it("yorqin dog'lar to'q fonni och qilmaydi", () => {
    const neon: PhotoSample = {
      rows: ROWS,
      cols: COLS,
      cells: Array.from({ length: ROWS * COLS }, (_, i) =>
        i % COLS < 3 ? { r: 235, g: 40, b: 180, a: 1 } : { r: 40, g: 40, b: 44, a: 1 },
      ),
    };
    expect(photoTheme('light', neon)).toBe('dark');
  });

  /** Ro'yxat pastda turadi: tepasi och, pasti to'q rasmda yozuv oq. */
  it("tepasi och, pasti to'q rasmda pastki qism hal qiladi", () => {
    expect(photoTheme('light', split(BRIGHT_TOP, DARK_BOTTOM, 0.4))).toBe('dark');
  });
});
