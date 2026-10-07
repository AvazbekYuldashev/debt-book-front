import {
  DEFAULT_TRANSPARENCY,
  TRANSPARENCY_LEVELS,
  findTransparency,
  glassAlpha,
  reAlpha,
} from '../transparency';
import { makeGlass } from '../glass';
import { darkColors, lightColors } from '../colors';
import { makeShadows } from '../elevation';

const shadows = makeShadows(lightColors.shadow);

/**
 * Shaffoflik darajasi FOYDALANUVCHI tanlovi.
 *
 * To'g'ri qiymat fonga bog'liq: tinch rasmda sirt deyarli ko'rinmas
 * bo'lsa chiroyli, shovqinlisida esa o'sha qiymat matnni o'qib bo'lmas
 * qiladi. Dastur buni bila olmaydi.
 */
describe('findTransparency', () => {
  it('darajani topadi', () => {
    expect(findTransparency('clear')).toBe('clear');
  });

  it('notanish daraja standartga tushadi', () => {
    expect(findTransparency('xyz')).toBe(DEFAULT_TRANSPARENCY);
    expect(findTransparency(null)).toBe(DEFAULT_TRANSPARENCY);
  });
});

describe('reAlpha', () => {
  it('faqat alfani almashtiradi', () => {
    expect(reAlpha('rgba(255, 255, 255, 0.28)', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });

  /** Buzuq token butun ekranni yo'qotib yubormasligi kerak. */
  it('mos kelmagan satr oz holicha qaytadi', () => {
    expect(reAlpha('#FFFFFF', 0.5)).toBe('#FFFFFF');
  });
});

describe('glassAlpha', () => {
  /** Daraja oshgani sayin sirt QUYUQLASHADI. */
  it('darajalar tartibda', () => {
    for (const isDark of [false, true]) {
      for (const key of ['surface', 'strong', 'muted'] as const) {
        const steps = TRANSPARENCY_LEVELS.map(({ id }) => glassAlpha(id, isDark)[key]);
        for (let i = 1; i < steps.length; i += 1) {
          expect(steps[i]).toBeLessThan(steps[i - 1]);
        }
      }
    }
  });

  /** "Yo'q" - shaffoflik umuman yo'q: karta fonni to'liq yopadi. */
  it("Yo'q darajasi to'liq yopiq", () => {
    for (const isDark of [false, true]) {
      expect(glassAlpha('none', isDark)).toEqual({ surface: 1, strong: 1, muted: 1 });
    }
  });

  /** Sozlamada tartib "Xiralik" bilan bir xil: Yo'q -> Kam -> O'rta -> Ko'p. */
  it('sozlama tartibi xiralik bilan bir xil', () => {
    expect(TRANSPARENCY_LEVELS.map((item) => item.id)).toEqual(['none', 'solid', 'medium', 'clear']);
  });

  /** "Ko'p" - TO'LIQ shaffof: tus yo'q, karta faqat chegarasi bilan ajraladi. */
  it("Ko'p - to'liq shaffof", () => {
    for (const isDark of [false, true]) {
      expect(glassAlpha('clear', isDark).surface).toBe(0);
      expect(glassAlpha('clear', isDark).strong).toBe(0);
      // Ichki bo'lak shaffof karta ichida yo'qolmasin.
      expect(glassAlpha('clear', isDark).muted).toBeGreaterThan(0);
    }
  });

  /**
   * Karta va ko'tarilgan sirt ikki mavzuda bir xil.
   *
   * muted ATAYIN farq qiladi: qorong'i muted tusi TO'Q chip (alfa
   * ko'tarishni beradi), yorug'niki esa oq lift (past alfada yetarli).
   */
  it('mavzular teng', () => {
    for (const item of TRANSPARENCY_LEVELS) {
      const light = glassAlpha(item.id, false);
      const dark = glassAlpha(item.id, true);
      expect(dark.surface).toBe(light.surface);
      expect(dark.strong).toBe(light.strong);
    }
  });

  /** Qorong'i muted "Ko'p" da ham ota-kartadan ajraladi - to'q tus yuqori alfa talab qiladi. */
  it("qorong'i muted yorug'dan qalinroq", () => {
    for (const id of ['clear', 'medium', 'solid'] as const) {
      expect(glassAlpha(id, true).muted).toBeGreaterThan(glassAlpha(id, false).muted);
    }
  });
});

describe('makeGlass daraja bilan', () => {
  it('daraja sirtning alfasini ozgartiradi', () => {
    const clear = makeGlass(lightColors, shadows, true, 'clear');
    const solid = makeGlass(lightColors, shadows, true, 'solid');

    expect(clear.surface.backgroundColor).not.toBe(solid.surface.backgroundColor);
  });

  /** TUS mavzudan: daraja faqat qalinlikni o'zgartiradi, rangni emas. */
  it('telefonda rang ozgarmaydi, faqat alfa', () => {
    const clear = String(makeGlass(lightColors, shadows, true, 'clear').surface.backgroundColor);
    const solid = String(makeGlass(lightColors, shadows, true, 'solid').surface.backgroundColor);

    const rgbOf = (value: string) => value.replace(/,\s*[\d.]+\)$/, ')');
    expect(rgbOf(clear)).toBe(rgbOf(solid));
  });

  /**
   * FON RASMI SHISHAGA TEGMAYDI - bu testning asosiy vazifasi.
   *
   * Ilgari tegardi: rasm ustida alohida alfa jadvali, backdrop-filter
   * (blur + yorqinlik tuzatishi) va tus ostida oq xiralik ishlardi.
   * Natijada rasm qo'yilgan ilova rasmsizidan butunlay boshqacha - sut
   * rangli va so'nik - ko'rinardi. Foydalanuvchi aynan shuni rad etdi.
   *
   * Web ham, telefon ham tekshiriladi: muzlatish faqat web'da bor edi va
   * farq o'sha yerdan kirardi.
   */
  it("fon rasmi sirtlarni o'zgartirmaydi", () => {
    const { Platform } = require('react-native');
    const original = Platform.OS;
    for (const os of ['web', 'ios'] as const) {
      Platform.OS = os;
      try {
        for (const palette of [lightColors, darkColors]) {
          const isDark = palette === darkColors;
          for (const { id } of TRANSPARENCY_LEVELS) {
            const withPhoto = makeGlass(palette, shadows, true, id, isDark);
            const without = makeGlass(palette, shadows, false, id, isDark);
            expect([os, id, isDark, withPhoto]).toEqual([os, id, isDark, without]);
          }
        }
      } finally {
        Platform.OS = original;
      }
    }
  });
});
