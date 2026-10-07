import {
  contrastRatio,
  parseColor,
  photoFloor,
  readableShare,
  type PhotoSample,
  type Rgb,
} from '../photoTone';
import { TRANSPARENCY_LEVELS } from '../transparency';
import { darkColors, lightColors } from '../colors';
import { ACCENTS, applyAccent } from '../accent';

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
/** To'yingan o'rtacha rang - eski kulrang matn "Ko'p" da 3:1 dan tushardi. */
const MAGENTA = { r: 220, g: 30, b: 160 };
const MID_GRAY = { r: 128, g: 128, b: 128 };

const LEVELS = TRANSPARENCY_LEVELS.map((item) => item.id);

/** HSV -> RGB (0..255): rang aylanasini aylanib chiqish uchun. */
const hsv = (h: number, sat: number, val: number): Rgb => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return 255 * (val - val * sat * Math.max(0, Math.min(k, 4 - k, 1)));
  };
  return { r: f(5), g: f(3), b: f(1) };
};

/**
 * Har xil bir tusli rasmlar: butun kulrang shkala va rang aylanasi
 * (to'yingan va so'ngan, to'q va och). Kichik to'r - rasm bir xil, tezlik
 * uchun.
 */
const SWEEP: { name: string; photo: PhotoSample }[] = [];
for (let v = 0; v <= 255; v += 5) {
  SWEEP.push({ name: `kulrang ${v}`, photo: { rows: 4, cols: 1, cells: Array(4).fill({ r: v, g: v, b: v, a: 1 }) } });
}
// Zich: to'yingan och pushti (232,40,232) kabi tor "chuqurliklar" siyrak
// to'rdan sirg'alib o'tardi.
for (let h = 0; h < 360; h += 10) {
  for (const sat of [0.4, 0.7, 0.85, 1]) {
    for (const val of [0.3, 0.45, 0.6, 0.75, 0.9, 1]) {
      const color = hsv(h, sat, val);
      SWEEP.push({ name: `hsv(${h}, ${sat}, ${val})`, photo: { rows: 4, cols: 1, cells: Array(4).fill({ ...color, a: 1 }) } });
    }
  }
}

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

  /** "Yo'q" va "Kam": sirtning o'zi matnga fon - HAR QANDAY rasmda. */
  for (const theme of ['light', 'dark'] as const) {
    for (const level of ['none', 'solid'] as const) {
      it(`${theme} / ${level}: hamma rasmda hamma joyda o'qiladi`, () => {
        for (const [name, photo] of Object.entries(PHOTOS)) {
          expect([name, readableShare(photo, theme, level)]).toEqual([name, 1]);
        }
      });
    }
  }

  /**
   * "O'rta": jadvalning O'ZI yetarli - sirt matnga hali ham fon bo'ladi,
   * ko'rinish rasmga mos kelmasa ham.
   *
   * "Ko'p" bu yerda YO'Q va bu ataylab. Unda sirt deyarli ko'rinmaydi va
   * matn rasmning o'zi ustida turadi, ya'ni tanlangan ko'rinish rasmga
   * qarama-qarshi bo'lmasa (yorug' rejim + to'q rasm) jadval o'qita
   * olmaydi. Ilgari buni ko'rinishni AG'DARISH hal qilardi, lekin shunda
   * uch rejim to'q rasmda bir xil chiqib, sozlama buzuq bo'lib ko'rinardi.
   * Endi "Ko'p" ni chegara (photoFloor) o'qitadi - quyidagi
   * "chegara bilan hamma matn o'qiladi" testi aynan shuni qamrab oladi.
   */
  const TONED: Record<string, PhotoSample> = {
    "qop-qora": PHOTOS["qop-qora"],
    oppoq: PHOTOS.oppoq,
    "to'q tosh": PHOTOS["to'q tosh"],
    och: PHOTOS.och,
    pushti: uniform(MAGENTA),
    kulrang: uniform(MID_GRAY),
  };
  for (const theme of ['light', 'dark'] as const) {
    it(`${theme} rejim / medium: jadvalning o'zi o'qitadi`, () => {
      for (const [name, photo] of Object.entries(TONED)) {
        expect([name, readableShare(photo, theme, 'medium')]).toEqual([name, 1]);
      }
    });
  }

  /**
   * Web: "Ko'p" dan boshqa HAR daraja HAR QANDAY bir tusli rasmda
   * o'qiladi - kulrang shkala va butun rang aylanasi, chegarasiz.
   */
  const CLOSED = LEVELS.filter((level) => level !== 'clear');
  for (const theme of ['light', 'dark'] as const) {
    it(`web: ${theme} rejim - Ko'p dan boshqa darajalar butun rang aylanasida o'qiladi`, () => {
      const unreadable: string[] = [];
      for (const level of CLOSED) {
        for (const { name, photo } of SWEEP) {
          if (readableShare(photo, theme, level) < 1) unreadable.push(`${level}: ${name}`);
        }
      }
      expect(unreadable).toEqual([]);
    });
  }

  /**
   * Telefon: muzlatish ham, ko'rinishning rasmga moslashuvi ham yo'q - har
   * daraja, tanlangan rejimning o'zida, butun rang aylanasida o'qiladi.
   */
  for (const theme of ['light', 'dark'] as const) {
    it(`telefon: ${theme} - hamma darajada butun rang aylanasi o'qiladi`, () => {
      const unreadable: string[] = [];
      for (const level of LEVELS) {
        for (const { name, photo } of SWEEP) {
          if (readableShare(photo, theme, level, false) < 1) unreadable.push(`${level}: ${name}`);
        }
      }
      expect(unreadable).toEqual([]);
    });
  }

  /**
   * Telefonda muzlatish ham, ko'rinishning rasmga moslashuvi ham yo'q -
   * u yerda HAR daraja HAR QANDAY rasmda o'qilishi shart.
   */
  for (const theme of ['light', 'dark'] as const) {
    for (const { id: level } of TRANSPARENCY_LEVELS) {
      it(`telefon: ${theme} / ${level}: hamma rasmda o'qiladi`, () => {
        for (const [name, photo] of Object.entries(PHOTOS)) {
          expect([name, readableShare(photo, theme, level, false)]).toEqual([name, 1]);
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
 * ThemeProvider beradigan YAKUNIY palitra: ilova rangi + rasm ustidagi
 * kulrang matn.
 */
const paletteFor = (theme: 'light' | 'dark', accentId: string) => {
  const base = applyAccent(theme === 'dark' ? darkColors : lightColors, accentId, theme === 'dark');
  return { ...base, textSecondary: base.textSecondaryOnPhoto };
};

/**
 * Eng kam tus (photoFloor): ko'rinish rasmning kontent qismiga qarab
 * tanlanadi, sirtlar esa BUTUN ekranda - chegara matnni hamma joyda
 * o'qitadi. Oddiy rasmlarda u 0 va "Ko'p" to'liq shaffof qoladi.
 */
describe('photoFloor', () => {
  /**
   * "Ko'p" TO'LIQ SHAFFOF qoladi - lekin faqat ko'rinish rasmga mos
   * kelganda: to'q rasmda tungi rejim, och rasmda yorug' rejim. O'shanda
   * matn allaqachon rasmga qarama-qarshi va tus qo'shish shart emas.
   */
  it("mos ko'rinishda chegara yo'q - Ko'p to'liq shaffof", () => {
    for (const [name, photo, fits] of [
      ['qop-qora', uniform({ r: 0, g: 0, b: 0 }), 'dark'],
      ["to'q tosh", uniform(DARK), 'dark'],
      ['och', uniform(BRIGHT), 'light'],
      ['oppoq', uniform({ r: 255, g: 255, b: 255 }), 'light'],
    ] as const) {
      expect([name, photoFloor(photo, paletteFor(fits, 'green'), fits)]).toEqual([
        name,
        { text: 0, colored: 0 },
      ]);
    }
  });

  /**
   * Ko'rinish rasmga MOS KELMASA (yorug' rejim + to'q rasm) chegara
   * ko'tariladi: karta quyuqlashadi va matn o'qiladi.
   *
   * Bu ag'darishni olib tashlashning NARXI va u ataylab to'langan.
   * Ilgari dastur ko'rinishni o'zi ag'darardi, natijada to'q rasmda
   * "Yorug'" tanlab bo'lmasdi. Endi tanlov ustun, qarama-qarshilikni esa
   * karta quyuqligi hal qiladi.
   */
  it("mos kelmagan ko'rinishda chegara ko'tariladi", () => {
    for (const [name, photo, against] of [
      ['qop-qora', uniform({ r: 0, g: 0, b: 0 }), 'light'],
      ['oppoq', uniform({ r: 255, g: 255, b: 255 }), 'dark'],
    ] as const) {
      const floors = photoFloor(photo, paletteFor(against, 'green'), against);
      expect([name, floors.text > 0, floors.colored > 0]).toEqual([name, true, true]);
    }
  });

  /**
   * Tepasi och osmon, pasti to'q yer: yozuv oq (ro'yxat to'q yer ustida),
   * sarlavha va summa kartasi esa osmon ustida - chegara ularni o'qitadi.
   */
  it("osmon ustidagi sarlavha ham o'qiladi", () => {
    const photo = split({ r: 200, g: 215, b: 235 }, { r: 35, g: 40, b: 30 }, 0.36);
    const look = 'light';
    const palette = paletteFor(look, 'green');
    const floors = photoFloor(photo, palette, look);
    expect(floors.text).toBeGreaterThan(0);
    expect(readableShare(photo, look, 'clear', true, { palette })).toBeLessThan(0.95);
    for (const level of LEVELS) {
      expect([level, readableShare(photo, look, level, true, { floors, palette })]).toEqual([level, 1]);
    }
    for (const level of ['solid', 'medium'] as const) {
      expect([level, readableShare(photo, look, level, true, { floors, palette, colored: true })]).toEqual([level, 1]);
    }
  });

  /**
   * Web, HAR ilova rangi, HAR bir tusli rasm: chegara bilan asosiy va
   * kulrang matn hamma darajada, rangli matn (summalar, xavf, ilova
   * rangi) esa "Kam" va "O'rta" da o'qiladi.
   */
  it("chegara bilan hamma matn o'qiladi - har ilova rangi, butun rang aylanasi", () => {
    const bad: string[] = [];
    for (const { id: accent } of ACCENTS) {
      for (const preferred of ['light', 'dark'] as const) {
        for (const { name, photo } of SWEEP) {
          for (const level of LEVELS) {
            const look = preferred;
            const palette = paletteFor(look, accent);
            const floors = photoFloor(photo, palette, look);
            const colored = level === 'solid' || level === 'medium';
            if (readableShare(photo, look, level, true, { floors, palette, colored }) < 1) {
              bad.push(`${accent} ${preferred} ${level} ${name} (${look})`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  }, 60000);

  /** Telefon: o'lchov yo'q - jadvalning o'zi rangli matnni ham o'qitadi ("Kam", "O'rta"). */
  it("telefon: rangli matn Kam va O'rta da har qanday rasmda o'qiladi", () => {
    const bad: string[] = [];
    for (const { id: accent } of ACCENTS) {
      for (const theme of ['light', 'dark'] as const) {
        const palette = paletteFor(theme, accent);
        for (const { name, photo } of SWEEP) {
          for (const level of ['none', 'solid', 'medium'] as const) {
            if (readableShare(photo, theme, level, false, { palette, colored: true }) < 1) {
              bad.push(`${accent} ${theme} ${level} ${name}`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  }, 60000);
});
