import { ACCENTS, DEFAULT_ACCENT, applyAccent, findAccent, withAlpha } from '../accent';
import { darkColors, lightColors } from '../colors';

/**
 * Bitta rang butun ilovani bo'yaydi.
 *
 * Brand rangi 67 ta joyda bitta token orqali o'qiladi, shuning uchun
 * tokenni almashtirish kifoya. Lekin MA'NO tashiydigan ranglar bunga
 * kirmaydi - ularni almashtirish qarz bilan haqni aralashtirardi.
 */
describe('findAccent', () => {
  it('belgisi boyicha topadi', () => {
    expect(findAccent('blue').id).toBe('blue');
  });

  /** Eski ilova yangi rang yuborsa ham ekran chizilishi kerak. */
  it('notanish belgi standartga tushadi', () => {
    expect(findAccent('rainbow').id).toBe(DEFAULT_ACCENT);
    expect(findAccent(null).id).toBe(DEFAULT_ACCENT);
    expect(findAccent(undefined).id).toBe(DEFAULT_ACCENT);
  });
});

describe('withAlpha', () => {
  it('hex ni rgba ga aylantiradi', () => {
    expect(withAlpha('#15803D', 0.1)).toBe('rgba(21, 128, 61, 0.1)');
  });
});

describe('applyAccent', () => {
  it('asosiy rang almashadi', () => {
    const next = applyAccent(lightColors, 'blue', false);

    expect(next.primary).toBe(findAccent('blue').light.primary);
    expect(next.primary).not.toBe(lightColors.primary);
  });

  /** Qorong'ida ranglar ochroq: to'q rang qora fonda ko'rinmaydi. */
  it('mavzuga qarab boshqa tus olinadi', () => {
    const yorug = applyAccent(lightColors, 'blue', false);
    const qorongi = applyAccent(darkColors, 'blue', true);

    expect(yorug.primary).not.toBe(qorongi.primary);
  });

  /**
   * MOLIYAVIY RANGLAR TEGILMAYDI. Ko'k rang tanlagan odam ham qarzni
   * haqdan ajrata olishi kerak.
   */
  it('qarz va haq ranglari ozgarmaydi', () => {
    const next = applyAccent(lightColors, 'violet', false);

    expect(next.positive).toBe(lightColors.positive);
    expect(next.positiveSoft).toBe(lightColors.positiveSoft);
    expect(next.negative).toBe(lightColors.negative);
    expect(next.negativeSoft).toBe(lightColors.negativeSoft);
  });

  /** Shaffof tuslar ham asosiy rangdan: aks holda tugma ko'k, fon yashil qolardi. */
  it('shaffof tuslar ham asosiy rangdan keladi', () => {
    const next = applyAccent(lightColors, 'amber', false);
    const amber = findAccent('amber').light.primary;

    expect(next.glassPrimarySoft).toBe(withAlpha(amber, 0.1));
    expect(next.ambientGreen).toBe(withAlpha(amber, 0.05));
  });

  it('gradient ham almashadi', () => {
    const next = applyAccent(lightColors, 'indigo', false);
    const indigo = findAccent('indigo').light;

    expect(next.ctaGradientStart).toBe(indigo.gradientStart);
    expect(next.ctaGradientEnd).toBe(indigo.primary);
    expect(next.ctaText).toBe(indigo.onGradient);
  });

  /** Sof funksiya: kirish tokenlari o'zgarmaydi. */
  it('kirish tokenlariga tegmaydi', () => {
    const avval = lightColors.primary;
    applyAccent(lightColors, 'blue', false);

    expect(lightColors.primary).toBe(avval);
  });

  /** Neytral tokenlar (fon, matn, chegara) brandga bog'liq emas. */
  it('neytral tokenlar ozgarmaydi', () => {
    const next = applyAccent(lightColors, 'violet', false);

    expect(next.background).toBe(lightColors.background);
    expect(next.textPrimary).toBe(lightColors.textPrimary);
    expect(next.border).toBe(lightColors.border);
  });
});

describe('ACCENTS royxati', () => {
  it('har tanlov ikkala mavzu uchun tus beradi', () => {
    for (const item of ACCENTS) {
      expect(item.light.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(item.dark.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(item.light.primary).not.toBe(item.dark.primary);
    }
  });

  it('belgilar takrorlanmaydi', () => {
    const ids = ACCENTS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /** Standart tanlov ro'yxatda bo'lishi shart. */
  it('standart tanlov royxatda bor', () => {
    expect(ACCENTS.some((item) => item.id === DEFAULT_ACCENT)).toBe(true);
  });
});
