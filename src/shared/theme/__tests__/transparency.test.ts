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
  it("rasm ustida eng shaffof daraja ham matnga fon beradi", () => {
    for (const isDark of [false, true]) {
      expect(glassAlpha('clear', true, isDark).surface).toBeGreaterThanOrEqual(0.6);
    }
  });

  /**
   * Yorug' mavzuda "O'rta" loyqa oraliqda TURMAYDI: 0.5 atrofidagi oq
   * to'q rasm ustida kulrang "soya" bo'lib ko'rinardi. U toza kartaga
   * yaqin bo'lishi shart.
   */
  it("yorug' mavzuda O'rta toza karta", () => {
    expect(glassAlpha('medium', true, false).surface).toBeGreaterThanOrEqual(0.8);
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
