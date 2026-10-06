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

  /** Har jadvalda darajalar tartibda: ko'p -> o'rta -> kam. */
  it('har jadvalda darajalar tartibda', () => {
    for (const isDark of [false, true]) {
      const clear = glassAlpha('clear', true, isDark).surface;
      const medium = glassAlpha('medium', true, isDark).surface;
      const solid = glassAlpha('solid', true, isDark).surface;

      expect(clear).toBeLessThan(medium);
      expect(medium).toBeLessThan(solid);
    }
  });

  /**
   * "KO'P" DEGANI HAQIQATAN SHAFFOF.
   *
   * Yarim shaffof oq sirt to'q rasm ustida sut rangli tuman berardi -
   * rasm ham ko'rinmay, karta ham toza bo'lmay qolardi. Eng shaffof
   * daraja o'sha loyqa oraliqdan butunlay chiqib ketishi kerak.
   */
  it('eng shaffof daraja deyarli korinmas', () => {
    for (const isDark of [false, true]) {
      expect(glassAlpha('clear', true, isDark).surface).toBeLessThan(0.15);
    }
  });

  /**
   * O'RTA darajada yorug' mavzu QUYUQROQ: oq tus to'q rasm bilan
   * aralashganda tuman beradi, to'q tus esa unga qo'shilib ketadi.
   */
  it('orta darajada yorug mavzu quyuqroq', () => {
    expect(glassAlpha('medium', true, false).surface)
      .toBeGreaterThan(glassAlpha('medium', true, true).surface);
  });

  /**
   * Yorug' mavzuda "O'rta" loyqa oraliqda TURMAYDI: 0.5 atrofidagi oq
   * to'q rasm ustida kulrang "soya" bo'lib ko'rinardi. U toza kartaga
   * yaqin bo'lishi shart.
   */
  it("yorug' mavzuda O'rta toza karta", () => {
    expect(glassAlpha('medium', true, false).surface).toBeGreaterThanOrEqual(0.8);
  });

  /** Rasmsiz esa ikki mavzu bir xil - u yerda fon past kontrastli. */
  it('rasmsiz mavzular teng', () => {
    for (const item of TRANSPARENCY_LEVELS) {
      expect(glassAlpha(item.id, false, false))
        .toEqual(glassAlpha(item.id, false, true));
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
