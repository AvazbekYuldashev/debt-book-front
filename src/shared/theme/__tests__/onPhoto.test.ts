import { photoTextHalo } from '../onPhoto';
import { darkColors, lightColors } from '../colors';

/**
 * Fon rasmi ustidagi sarlavhalar halo bilan ajratiladi.
 *
 * Ekranda matnning ko'pi kartalar ustida va ular o'z foniga ega. Guruh
 * va bo'lim sarlavhalari esa panel TASHQARISIDA, to'g'ridan-to'g'ri
 * fonda turadi - to'q rasmda yorug' mavzudagi to'q matn unga qo'shilib
 * ketardi.
 */
describe('photoTextHalo', () => {
  it('rasm bolmasa halo yoq', () => {
    expect(photoTextHalo(lightColors, false)).toEqual({});
  });

  /** Halo MAVZU fonidan: shu sababli u har qanday rasmda ishlaydi. */
  it('yorugda oq, qorongida qora halo', () => {
    const yorug = photoTextHalo(lightColors, true);
    const qorongi = photoTextHalo(darkColors, true);

    expect(yorug.textShadowColor).toBe(lightColors.background);
    expect(qorongi.textShadowColor).toBe(darkColors.background);
    expect(yorug.textShadowColor).not.toBe(qorongi.textShadowColor);
  });

  /** Nur matnni har tomondan o'rab olishi kerak - siljish yo'q. */
  it('nur har tomonga teng tarqaladi', () => {
    const halo = photoTextHalo(lightColors, true);

    expect(halo.textShadowOffset).toEqual({ width: 0, height: 0 });
    expect(halo.textShadowRadius).toBeGreaterThan(0);
  });
});
