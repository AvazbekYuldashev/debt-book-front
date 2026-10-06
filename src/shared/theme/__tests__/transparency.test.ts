import {
  DEFAULT_TRANSPARENCY,
  TRANSPARENCY_LEVELS,
  findTransparency,
  glassAlpha,
  reAlpha,
} from '../transparency';
import { makeGlass } from '../glass';
import { lightColors } from '../colors';
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
    const clear = glassAlpha('clear', false).surface;
    const medium = glassAlpha('medium', false).surface;
    const solid = glassAlpha('solid', false).surface;

    expect(clear).toBeLessThan(medium);
    expect(medium).toBeLessThan(solid);
  });

  /**
   * Har jadvalda va har sirtda darajalar tartibda: ko'p -> o'rta -> kam
   * -> yo'q. "Kam" hech qachon "Ko'p" dan shaffofroq emas.
   */
  it('har jadvalda darajalar tartibda', () => {
    for (const onPhoto of [false, true]) {
      for (const isDark of [false, true]) {
        for (const key of ['surface', 'strong', 'muted'] as const) {
          const clear = glassAlpha('clear', onPhoto, isDark)[key];
          const medium = glassAlpha('medium', onPhoto, isDark)[key];
          const solid = glassAlpha('solid', onPhoto, isDark)[key];
          const none = glassAlpha('none', onPhoto, isDark)[key];

          expect(clear).toBeLessThan(medium);
          expect(medium).toBeLessThan(solid);
          expect(solid).toBeLessThan(none);
        }
      }
    }
  });

  /** "Yo'q" - shaffoflik umuman yo'q: karta fonni to'liq yopadi. */
  it("Yo'q darajasi to'liq yopiq", () => {
    for (const onPhoto of [false, true]) {
      for (const isDark of [false, true]) {
        expect(glassAlpha('none', onPhoto, isDark)).toEqual({ surface: 1, strong: 1, muted: 1 });
      }
    }
  });

  /** Sozlamada tartib "Xiralik" bilan bir xil: Yo'q -> Kam -> O'rta -> Ko'p. */
  it('sozlama tartibi xiralik bilan bir xil', () => {
    expect(TRANSPARENCY_LEVELS.map((item) => item.id)).toEqual(['none', 'solid', 'medium', 'clear']);
  });

  /**
   * Rasm ustida "Ko'p" - MUZLI SHISHA, yalang'och rasm emas: fon doim
   * xiralashtirilgani uchun yarim shaffof sirt tuman emas, Samsung
   * bildirishnoma kartasi kabi ko'rinadi va matnga fon beradi.
   * (Har qanday rasmda o'qilishi photoTone testida tekshiriladi.)
   */
  it("Ko'p - to'liq shaffof (muzlatish bor joyda)", () => {
    for (const isDark of [false, true]) {
      expect(glassAlpha('clear', true, isDark).surface).toBe(0);
      expect(glassAlpha('clear', true, isDark).strong).toBe(0);
      // Ichki bo'lak shaffof karta ichida yo'qolmasin.
      expect(glassAlpha('clear', true, isDark).muted).toBeGreaterThan(0);
    }
  });

  /**
   * Muzlatishsiz (telefon) O'rta va Ko'p tusli qoladi; har qanday rasmda
   * o'qilishi photoTone testida qulflangan. Yopiqroq darajalarga chegara
   * tegmaydi.
   */
  it("muzlatishsiz O'rta va Ko'p tusli, qolganlari o'zgarmaydi", () => {
    for (const isDark of [false, true]) {
      expect(glassAlpha('clear', true, isDark, false).surface).toBeGreaterThan(0.5);
      expect(glassAlpha('medium', true, isDark, false).surface).toBeGreaterThan(
        glassAlpha('clear', true, isDark, false).surface,
      );
      expect(glassAlpha('solid', true, isDark, false)).toEqual(glassAlpha('solid', true, isDark));
      expect(glassAlpha('none', true, isDark, false)).toEqual(glassAlpha('none', true, isDark));
    }
  });

  /**
   * Telefonda ham zinapoya tartibda: chegara "O'rta" ni "Kam" dan
   * qalinroq qilib qo'ymasligi kerak (ilgari muted'da shunday edi).
   */
  it('muzlatishsiz ham darajalar tartibda', () => {
    for (const isDark of [false, true]) {
      for (const key of ['surface', 'strong', 'muted'] as const) {
        const steps = TRANSPARENCY_LEVELS.map(({ id }) => glassAlpha(id, true, isDark, false)[key]);
        for (let i = 1; i < steps.length; i += 1) {
          expect(steps[i]).toBeLessThan(steps[i - 1]);
        }
      }
    }
  });

  /**
   * Darajalar bir-biridan ANIQ farq qiladi: ilgari 1 / 0.92 / 0.85 / 0.78
   * edi va to'rttasi deyarli bir xil to'q karta bo'lib ko'rinardi.
   */
  it("rasm ustida darajalar orasida aniq farq", () => {
    for (const isDark of [false, true]) {
      const steps = TRANSPARENCY_LEVELS.map(({ id }) => glassAlpha(id, true, isDark).surface);
      for (let i = 1; i < steps.length; i += 1) {
        expect(steps[i - 1] - steps[i]).toBeGreaterThanOrEqual(0.15);
      }
    }
  });

  /**
   * Rasmsiz esa karta va ko'tarilgan sirt ikki mavzuda bir xil - u yerda
   * fon past kontrastli.
   *
   * muted ATAYIN farq qiladi: qorong'i muted tusi TO'Q chip (alfa
   * ko'tarishni beradi), yorug'niki esa oq lift (past alfada yetarli).
   * Qorong'i muted o'qilishi glass.test'da qulflangan.
   */
  it('rasmsiz mavzular teng', () => {
    for (const item of TRANSPARENCY_LEVELS) {
      const light = glassAlpha(item.id, false, false);
      const dark = glassAlpha(item.id, false, true);
      expect(dark.surface).toBe(light.surface);
      expect(dark.strong).toBe(light.strong);
    }
  });

  /** Qorong'i muted "Ko'p" da ham ota-kartadan ajraladi - to'q tus yuqori alfa talab qiladi. */
  it("rasmsiz qorong'i muted yorug'dan qalinroq", () => {
    for (const id of ['clear', 'medium', 'solid'] as const) {
      expect(glassAlpha(id, false, true).muted).toBeGreaterThan(glassAlpha(id, false, false).muted);
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
  it('rang ozgarmaydi, faqat alfa', () => {
    const clear = String(makeGlass(lightColors, shadows, true, 'clear').surface.backgroundColor);
    const solid = String(makeGlass(lightColors, shadows, true, 'solid').surface.backgroundColor);

    const rgbOf = (value: string) => value.replace(/,\s*[\d.]+\)$/, ')');
    expect(rgbOf(clear)).toBe(rgbOf(solid));
  });
});
