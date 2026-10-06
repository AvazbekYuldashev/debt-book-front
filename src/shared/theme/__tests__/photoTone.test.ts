import {
  PHOTO_SCRIM_END,
  contrastRatio,
  parseColor,
  readableShare,
  scrimAt,
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
 * Har darajada, har ikki mavzuda, HAR QANDAY rasmda matn o'qiladi -
 * Samsung bildirishnoma kartalari kabi. Shu sababli ilova mavzuni hech
 * qachon o'zi almashtirmaydi: yorug' rejim to'q fonda ham yorug' qoladi.
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
          for (const dim of [0, 0.15, 0.4, 0.7]) {
            expect([name, dim, readableShare(photo, theme, dim, level)]).toEqual([name, dim, 1]);
          }
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
    expect(readableShare(empty, 'light', 0, 'clear')).toBe(1);
  });
});
