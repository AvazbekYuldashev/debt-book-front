import { makeGlass } from '../glass';
import { lightColors } from '../colors';
import { makeShadows } from '../elevation';

const shadows = makeShadows(lightColors.shadow);

/**
 * TEKIS sirt - yangi ekran uslubining asosi.
 *
 * Shishadan farqi: ostidagi fon KO'RINMAYDI. Shisha ilovaning o'z
 * bezakli foni uchun o'ylangan; mazmun zich bo'lgan ro'yxatlarda esa
 * fon naqshlari matn bilan aralashib, qatorni "shovqinli" qilardi.
 */
describe('glass.flat', () => {
  it('sirt toliq toldirilgan - shaffof emas', () => {
    const glass = makeGlass(lightColors, shadows, false);

    expect(glass.flat.backgroundColor).toBe(lightColors.surface);
    expect(String(glass.flat.backgroundColor)).not.toContain('rgba');
  });

  /** Fon rasmi bor-yo'qligi tekis sirtga ta'sir qilmaydi - u baribir to'la. */
  it('fon rasmi bilan ham bir xil', () => {
    const rasmsiz = makeGlass(lightColors, shadows, false);
    const rasmli = makeGlass(lightColors, shadows, true);

    expect(rasmli.flat.backgroundColor).toBe(rasmsiz.flat.backgroundColor);
  });

  /** Shisha esa rasm ustida quyuqlashadi - ikkovi boshqa-boshqa. */
  it('shisha rasm ustida ozgaradi, tekis esa yoq', () => {
    const rasmsiz = makeGlass(lightColors, shadows, false);
    const rasmli = makeGlass(lightColors, shadows, true);

    expect(rasmli.surface.backgroundColor).not.toBe(rasmsiz.surface.backgroundColor);
    expect(rasmli.flat.backgroundColor).toBe(rasmsiz.flat.backgroundColor);
  });

  /** Chegara nozik: qalin chiziq kartani "quti"ga aylantirardi. */
  it('chegara nozik va soya bor', () => {
    const glass = makeGlass(lightColors, shadows, false);

    expect(glass.flat.borderWidth).toBeLessThan(1);
    expect(glass.flat.borderColor).toBe(lightColors.border);
  });
});
