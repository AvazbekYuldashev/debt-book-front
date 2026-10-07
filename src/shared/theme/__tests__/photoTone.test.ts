import {
  contrastRatio,
  parseColor,
  photoFloor,
  photoTheme,
  photoThemeReason,
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
   * "O'rta" va "Ko'p": matn rasmning o'zi ustida - uni KO'RINISH o'qitadi
   * (to'q rasmda oq yozuv, och rasmda to'q). Ko'rinishni photoTheme
   * tanlaydi; foydalanuvchi qaysi rejimni tanlagan bo'lmasin.
   */
  const TONED: Record<string, PhotoSample> = {
    "qop-qora": PHOTOS["qop-qora"],
    oppoq: PHOTOS.oppoq,
    "to'q tosh": PHOTOS["to'q tosh"],
    och: PHOTOS.och,
    pushti: uniform(MAGENTA),
    kulrang: uniform(MID_GRAY),
  };
  for (const preferred of ['light', 'dark'] as const) {
    for (const level of ['medium', 'clear'] as const) {
      it(`${preferred} rejim / ${level}: ko'rinish rasmga mos va o'qiladi`, () => {
        for (const [name, photo] of Object.entries(TONED)) {
          const look = photoTheme(preferred, photo, level);
          expect([name, look, readableShare(photo, look, level)]).toEqual([name, look, 1]);
        }
      });
    }
  }

  /**
   * Web: HAR daraja ("Ko'p" - to'liq shaffof ham) HAR QANDAY bir tusli
   * rasmda o'qiladi - kulrang shkala va butun rang aylanasi. Matnni
   * ko'rinish (photoTheme) va muzlatishning yorqinlik tuzatishi o'qitadi.
   */
  for (const preferred of ['light', 'dark'] as const) {
    it(`web: ${preferred} rejim - hamma darajada butun rang aylanasi o'qiladi`, () => {
      const unreadable: string[] = [];
      for (const level of LEVELS) {
        for (const { name, photo } of SWEEP) {
          const look = photoTheme(preferred, photo, level);
          if (readableShare(photo, look, level) < 1) unreadable.push(`${level}: ${name} (${look})`);
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
  /** Foydalanuvchi talabi: "Ko'p" - to'liq shaffof. Oddiy fonlarda tus qo'shilmaydi. */
  it("oddiy fonlarda chegara yo'q - Ko'p to'liq shaffof", () => {
    for (const [name, photo] of [
      ['qop-qora', uniform({ r: 0, g: 0, b: 0 })],
      ["to'q tosh", uniform(DARK)],
      ['och', uniform(BRIGHT)],
      ['oppoq', uniform({ r: 255, g: 255, b: 255 })],
    ] as const) {
      for (const preferred of ['light', 'dark'] as const) {
        const look = photoTheme(preferred, photo, 'clear');
        expect([name, preferred, photoFloor(photo, paletteFor(look, 'green'), look)]).toEqual([
          name,
          preferred,
          { text: 0, colored: 0 },
        ]);
      }
    }
  });

  /**
   * Tepasi och osmon, pasti to'q yer: yozuv oq (ro'yxat to'q yer ustida),
   * sarlavha va summa kartasi esa osmon ustida - chegara ularni o'qitadi.
   */
  it("osmon ustidagi sarlavha ham o'qiladi", () => {
    const photo = split({ r: 200, g: 215, b: 235 }, { r: 35, g: 40, b: 30 }, 0.36);
    const look = photoTheme('light', photo, 'clear');
    expect(look).toBe('dark');
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
            const look = photoTheme(preferred, photo, level);
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

  /**
   * Shaffoflik darajasi hisobga olinadi: yopiq sirtda ikkala ko'rinish
   * ham o'qiladi - tanlov saqlanadi. To'liq shaffof "Ko'p" da esa matn
   * rasmning o'zi ustida: qorong'i rejim + o'rtacha kulrangda oq yozuv
   * o'qilmaydi, to'q yozuv o'qiladi.
   */
  it("o'rtacha fonda tanlov saqlanadi, Ko'p da yozuv rasmga ergashadi", () => {
    const mid = uniform({ r: 150, g: 150, b: 150 });
    for (const level of ['none', 'solid', 'medium'] as const) {
      expect([level, photoTheme('dark', mid, level)]).toEqual([level, 'dark']);
    }
    expect(photoTheme('dark', mid, 'clear')).toBe('light');
  });

  /** Foydalanuvchi talabi: yorug' rejim + to'q fon - HAR darajada oq yozuv. */
  it("to'q fonda har darajada oq yozuv", () => {
    for (const level of LEVELS) {
      expect([level, photoTheme('light', uniform(DARK), level)]).toEqual([level, 'dark']);
      expect([level, photoTheme('dark', uniform(BRIGHT), level)]).toEqual([level, 'light']);
    }
  });

  /** Yopiq darajalarda daraja hech narsani o'zgartirmaydi - faqat yorqinlik hal qiladi. */
  it("Yo'q va Kam da ko'rinish faqat yorqinlikka bog'liq", () => {
    for (const preferred of ['light', 'dark'] as const) {
      for (const level of ['none', 'solid'] as const) {
        for (const { name, photo } of SWEEP) {
          expect([name, photoTheme(preferred, photo, level)]).toEqual([name, photoTheme(preferred, photo)]);
        }
      }
    }
  });

  /**
   * Aralash rasmlar: yorqinlik aniq qaror qilgan joyda shaffoflik uni
   * AG'DARMAYDI - na tepadagi osmon, na bitta yorqin/qora dog' sababli.
   */
  it("aralash rasmda yorqinlik qarori har darajada saqlanadi", () => {
    const withCell = (base: Rgb, odd: Rgb): PhotoSample => {
      const photo = uniform(base);
      photo.cells[200] = { ...odd, a: 1 };
      return photo;
    };
    const cases: [string, PhotoSample, 'light' | 'dark', 'light' | 'dark'][] = [
      // Osmon ekranning yarmidan ko'pi, ro'yxat esa to'q yer ustida.
      ["och osmon, to'q yer", split({ r: 200, g: 215, b: 235 }, { r: 35, g: 40, b: 30 }, 0.55), 'light', 'dark'],
      ["test osmoni, to'q yer", split(BRIGHT_TOP, DARK_BOTTOM, 0.6), 'light', 'dark'],
      // Xira rasm + chiroq/oy.
      ['xira + chiroq', withCell({ r: 80, g: 80, b: 80 }, { r: 255, g: 255, b: 255 }), 'light', 'dark'],
      // Och rasm + qora logotip.
      ['och + logotip', withCell({ r: 225, g: 225, b: 225 }, { r: 0, g: 0, b: 0 }), 'light', 'light'],
      ['och + logotip', withCell({ r: 225, g: 225, b: 225 }, { r: 0, g: 0, b: 0 }), 'dark', 'light'],
    ];
    for (const [name, photo, preferred, expected] of cases) {
      for (const level of LEVELS) {
        expect([name, preferred, level, photoTheme(preferred, photo, level)]).toEqual([name, preferred, level, expected]);
      }
    }
  });

  /**
   * Yo'q -> Ko'p bo'ylab ko'rinish ko'pi bilan BIR marta almashadi va
   * hech qachon ortga qaytmaydi: aks holda darajani bosib o'tganda butun
   * ilova och-to'q bo'lib "miltillardi". Ikki rangli ustun va qator
   * rasmlarning to'liq to'plami.
   */
  it("daraja oshgan sari ko'rinish ortga qaytmaydi", () => {
    const COLORS: Rgb[] = [];
    for (const v of [0, 60, 110, 150, 190, 235]) COLORS.push({ r: v, g: v, b: v });
    COLORS.push({ r: 93, g: 9, b: 9 }, { r: 168, g: 201, b: 200 }, MAGENTA, { r: 40, g: 90, b: 200 }, { r: 230, g: 200, b: 60 });
    const columns = (left: Rgb, right: Rgb, count: number): PhotoSample => ({
      rows: ROWS,
      cols: COLS,
      cells: Array.from({ length: ROWS * COLS }, (_, i) => ({ ...(i % COLS < count ? left : right), a: 1 })),
    });
    const bad: string[] = [];
    for (const a of COLORS) {
      for (const b of COLORS) {
        if (a === b) continue;
        for (const count of [3, 6, 9]) {
          for (const [kind, photo] of [['ustun', columns(a, b, count)], ['qator', split(a, b, count / 12)]] as const) {
            for (const preferred of ['light', 'dark'] as const) {
              const looks = LEVELS.map((level) => photoTheme(preferred, photo, level));
              const changes = looks.filter((look, i) => i > 0 && look !== looks[i - 1]).length;
              if (changes > 1) bad.push(`${kind} ${JSON.stringify(a)}/${JSON.stringify(b)} ${count} ${preferred}: ${looks.join(',')}`);
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  }, 30000);

  /**
   * "O'rta" (standart) da ikkala ko'rinish ham HAR bir tusli rasmda
   * o'qiladi - shaffoflik sababli almashish faqat "Ko'p" da bo'lishi
   * mumkin.
   */
  it("O'rta da ikkala ko'rinish ham hamma rasmda o'qiladi", () => {
    const bad: string[] = [];
    for (const theme of ['light', 'dark'] as const) {
      for (const { name, photo } of SWEEP) {
        if (readableShare(photo, theme, 'medium') < 1) bad.push(`${theme} ${name}`);
      }
    }
    expect(bad).toEqual([]);
  });

  /** Sozlamalardagi izoh to'g'ri sababni aytadi. */
  it("ko'rinish sababi: rasm yoki shaffoflik", () => {
    expect(photoThemeReason('light', uniform(DARK), 'none')).toBe('photo');
    expect(photoThemeReason('light', uniform(DARK), 'clear')).toBe('photo');
    expect(photoThemeReason('light', uniform(BRIGHT), 'clear')).toBeNull();
    const mid = uniform({ r: 150, g: 150, b: 150 });
    expect(photoThemeReason('dark', mid, 'medium')).toBeNull();
    expect(photoThemeReason('dark', mid, 'clear')).toBe('glass');
  });

  /** Ro'yxat pastda turadi: tepasi och, pasti to'q rasmda yozuv oq. */
  it("tepasi och, pasti to'q rasmda pastki qism hal qiladi", () => {
    expect(photoTheme('light', split(BRIGHT_TOP, DARK_BOTTOM, 0.4))).toBe('dark');
  });
});
