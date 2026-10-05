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
   * FOTOSURAT ustida har daraja quyuqroq: ilovaning o'z foni past
   * kontrastli, ixtiyoriy rasm esa emas.
   */
  it('rasm ustida quyuqroq', () => {
    for (const item of TRANSPARENCY_LEVELS) {
      for (const isDark of [false, true]) {
        expect(glassAlpha(item.id, true, isDark).surface)
          .toBeGreaterThan(glassAlpha(item.id, false).surface);
      }
    }
  });

  /**
   * RASM USTIDA MAVZULAR TENG EMAS.
   *
   * Yorug' mavzuda sirt oq: to'q rasm ustida o'rta alfa sut rangli
   * tuman beradi. Qorong'ida esa tus rasmning o'ziga qo'shilib ketadi.
   * Shuning uchun yorug' mavzu har darajada QUYUQROQ bo'lishi kerak.
   */
  it('yorug mavzu rasm ustida quyuqroq', () => {
    for (const item of TRANSPARENCY_LEVELS) {
      expect(glassAlpha(item.id, true, false).surface)
        .toBeGreaterThan(glassAlpha(item.id, true, true).surface);
    }
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
