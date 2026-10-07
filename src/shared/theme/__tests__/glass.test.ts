import { makeGlass } from '../glass';
import { darkColors, lightColors } from '../colors';
import { makeShadows } from '../elevation';
import { ACCENTS } from '../accent';
import {
  FROST_BRIGHTNESS,
  FROST_HAZE,
  FROST_SATURATE,
  TRANSPARENCY_LEVELS,
  glassAlpha,
  reAlpha,
  withHaze,
} from '../transparency';
import { contrastRatio, luminance, mix, parseColor, type Rgb } from '../photoTone';

const themes = [
  ['yorug\'', lightColors],
  ['qorong\'i', darkColors],
] as const;

/** rgba(...) dagi alfa; alfasiz rang uchun 1. */
const alphaOf = (color?: string): number => {
  if (!color) return 1;
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (!m) return 1; // #RRGGBB — to'liq shaffofmas
  const parts = m[1].split(',').map((p) => p.trim());
  return parts.length < 4 ? 1 : Number(parts[3]);
};

describe('glass.modal', () => {
  /**
   * Dialoglar SHAFFOF BO'LMASLIGI shart.
   *
   * "Shisha" ko'rinishi `backdropFilter` blur'iga tayanadi, u esa faqat
   * web'da ishlaydi. Android/iOS'da blur yo'q — shaffof modal ortidagi
   * ro'yxat va summalar matn ustidan ko'rinib, o'qib bo'lmas darajada
   * aralashib ketardi. Shu sababli fon alfasi 1 bo'lishi kerak.
   */
  it.each(themes)('%s mavzuda modal foni shaffof emas', (_name, colors) => {
    const glass = makeGlass(colors, makeShadows(colors.shadow));
    expect(alphaOf(glass.modal.backgroundColor as string)).toBe(1);
  });

  it.each(themes)('%s mavzuda scrim shaffof — ort ko\'rinib tursin', (_name, colors) => {
    const glass = makeGlass(colors, makeShadows(colors.shadow));
    expect(alphaOf(glass.scrim.backgroundColor as string)).toBeLessThan(1);
  });
});

/**
 * Foydalanuvchi fon RASMI qo'yilganda sirtlar boshqacha yasaladi.
 *
 * Shisha retsepti ilovaning o'z bezakli foni uchun o'ylangan: past
 * kontrastli va och. Ixtiyoriy fotosurat ustida esa yarim shaffof oq
 * sirt sut rangli dog'ga aylanib, butun ekranni "xira" qilardi.
 */
describe('makeGlass — fon rasmi ustida', () => {
  it('rasm bor bolsa sirt quyuqroq', () => {
    const shadows = makeShadows(lightColors.shadow);
    const oddiy = makeGlass(lightColors, shadows, false);
    const rasmda = makeGlass(lightColors, shadows, true);

    expect(rasmda.surface.backgroundColor).not.toBe(oddiy.surface.backgroundColor);
    // Aniq alfa SOZLAMADAN keladi, shuning uchun bu yerda faqat yo'nalish
    // tekshiriladi: rasm ustida sirt quyuqroq bo'lishi SHART.
    expect(alphaOf(rasmda.surface.backgroundColor as string))
      .toBeGreaterThan(alphaOf(oddiy.surface.backgroundColor as string));
  });

  /** Ko'tarilgan sirt ham, ichki bo'lak ham o'z variantini oladi. */
  it('barcha shaffof sirtlar almashadi', () => {
    const shadows = makeShadows(lightColors.shadow);
    const oddiy = makeGlass(lightColors, shadows, false);
    const rasmda = makeGlass(lightColors, shadows, true);

    for (const key of ['raised', 'muted', 'pane', 'flush'] as const) {
      expect(alphaOf(rasmda[key].backgroundColor as string))
        .toBeGreaterThan(alphaOf(oddiy[key].backgroundColor as string));
    }
  });

  /** Dialog ATAYIN tegilmaydi: u allaqachon mustahkam fonda. */
  it('modal sirti ozgarmaydi', () => {
    const shadows = makeShadows(lightColors.shadow);
    const oddiy = makeGlass(lightColors, shadows, false);
    const rasmda = makeGlass(lightColors, shadows, true);

    expect(rasmda.modal.backgroundColor).toBe(oddiy.modal.backgroundColor);
  });
});

/**
 * "Shaffoflik" elementlarni MUZLI SHISHAGA aylantiradi: fon rasmi keskin
 * bo'lsa ham sirt ortidagi rasmni o'zi xiralashtiradi (web). To'liq yopiq
 * sirtda va bezakli fonda bunga hojat yo'q - scroll'dagi narxi qolardi.
 */
describe('muzli shisha', () => {
  const withPlatform = (os: string, run: () => void) => {
    const { Platform } = require('react-native');
    const original = Platform.OS;
    Platform.OS = os;
    try {
      run();
    } finally {
      Platform.OS = original;
    }
  };
  const frostOf = (style: Record<string, unknown>) => style.backdropFilter as string | undefined;
  const shadowsLight = makeShadows(lightColors.shadow);

  it('rasm ustida shaffof sirt ortini xiralashtiradi', () => {
    withPlatform('web', () => {
      const glass = makeGlass(lightColors, shadowsLight, true, 'clear');
      expect(frostOf(glass.surface as Record<string, unknown>)).toMatch(/blur/);
      expect(frostOf(glass.pane as Record<string, unknown>)).toMatch(/blur/);
      expect(frostOf(glass.flush as Record<string, unknown>)).toMatch(/blur/);
      expect(frostOf(glass.frost as Record<string, unknown>)).toMatch(/blur/);
    });
  });

  /**
   * CSS aynan photoTone modellagan retsept: o'qilish testi boshqa
   * qiymatni tekshirib, ekranda boshqasi chizilmasin.
   */
  it("muzlatish CSS'i o'qilish modeli bilan bir xil", () => {
    withPlatform('web', () => {
      const shadowsDark = makeShadows(darkColors.shadow);
      const light = frostOf(makeGlass(lightColors, shadowsLight, true, 'clear', false).surface as Record<string, unknown>);
      const dark = frostOf(makeGlass(darkColors, shadowsDark, true, 'clear', true).surface as Record<string, unknown>);
      const saturate = `saturate(${Math.round(FROST_SATURATE * 100)}%)`;
      expect(light).toContain(saturate);
      expect(dark).toContain(saturate);
      expect(light).toContain(`brightness(${FROST_BRIGHTNESS.light})`);
      expect(dark).toContain(`brightness(${FROST_BRIGHTNESS.dark})`);
    });
  });

  /**
   * OQ XIRALIK (foydalanuvchi talabi, rgba 255,255,255): muzlatilgan sirt
   * oqish shisha. "Ko'p" da sirt rangi sof oq xiralik; telefonda (blur
   * yo'q), "Yo'q" da va rasmsiz fonda xiralik qo'shilmaydi.
   */
  it("muzlatilgan sirtda oq xiralik, boshqa joyda yo'q", () => {
    const shadowsDark = makeShadows(darkColors.shadow);
    withPlatform('web', () => {
      expect(makeGlass(darkColors, shadowsDark, true, 'clear', true).surface.backgroundColor)
        .toBe(`rgba(255, 255, 255, ${FROST_HAZE.dark})`);
      expect(makeGlass(lightColors, shadowsLight, true, 'clear', false).surface.backgroundColor)
        .toBe(`rgba(255, 255, 255, ${FROST_HAZE.light})`);
      expect(makeGlass(darkColors, shadowsDark, true, 'medium', true).surface.backgroundColor)
        .toBe(withHaze(darkColors.glassSurfaceOnPhoto, glassAlpha('medium', true, true).surface, FROST_HAZE.dark));
      expect(makeGlass(darkColors, shadowsDark, true, 'none', true).surface.backgroundColor)
        .toBe(reAlpha(darkColors.glassSurfaceOnPhoto, 1));
      expect(makeGlass(darkColors, shadowsDark, false, 'clear', true).surface.backgroundColor)
        .toBe(reAlpha(darkColors.glassSurface, glassAlpha('clear', false, true).surface));
    });
    withPlatform('android', () => {
      expect(makeGlass(darkColors, shadowsDark, true, 'clear', true).surface.backgroundColor)
        .toBe(reAlpha(darkColors.glassSurfaceOnPhoto, glassAlpha('clear', true, true, false).surface));
    });
  });

  /**
   * Boshqa sirt ICHIDAGI bo'lak (nested): tus va alfa xuddi shunday,
   * lekin muzlatish ham, oq xiralik ham yo'q - ota sirtni qayta
   * muzlatib kulrang plita yasamasin.
   */
  it("ichki shisha muzlatmaydi va oq xiralik qo'shmaydi", () => {
    const shadowsDark = makeShadows(darkColors.shadow);
    withPlatform('web', () => {
      for (const level of ['solid', 'medium', 'clear'] as const) {
        const nested = makeGlass(darkColors, shadowsDark, true, level, true, { nested: true });
        for (const key of ['surface', 'pane', 'flush', 'raised'] as const) {
          expect([level, key, frostOf(nested[key] as Record<string, unknown>)]).toEqual([level, key, undefined]);
        }
        expect(nested.surface.backgroundColor).toBe(
          reAlpha(darkColors.glassSurfaceOnPhoto, glassAlpha(level, true, true).surface),
        );
        expect(nested.frost).toEqual({});
      }
    });
  });

  /** Rasm chegarasi (photoFloor): "Kam"/"O'rta" rangli matn chegarasini, "Ko'p" faqat matnnikini oladi. */
  it("rasm chegarasi darajaga qarab qo'llanadi", () => {
    const floors = { text: 0.2, colored: 0.6 };
    withPlatform('web', () => {
      expect(glassAlpha('clear', true, true, true, floors).surface).toBe(0.2);
      expect(glassAlpha('medium', true, true, true, floors).surface).toBe(0.6);
      expect(glassAlpha('solid', true, true, true, floors).surface).toBe(glassAlpha('solid', true, true).surface);
      expect(glassAlpha('none', true, true, true, floors).surface).toBe(1);
      // Telefonda o'lchov yo'q - jadval chegaralari.
      expect(glassAlpha('clear', true, true, false, floors)).toEqual(glassAlpha('clear', true, true, false));
    });
  });

  it("Yo'q darajasida va rasmsiz muzlatish yo'q", () => {
    withPlatform('web', () => {
      expect(frostOf(makeGlass(lightColors, shadowsLight, true, 'none').surface as Record<string, unknown>)).toBeUndefined();
      expect(frostOf(makeGlass(lightColors, shadowsLight, false, 'clear').surface as Record<string, unknown>)).toBeUndefined();
    });
  });
});

/** Rangni `below` ustiga o'z alfasi bilan qo'yadi - ekran shunday ko'radi. */
const over = (color: unknown, below: Rgb): Rgb => {
  const parsed = parseColor(String(color));
  if (!parsed) throw new Error(`rang o'qilmadi: ${String(color)}`);
  return mix(parsed, below, parsed.a);
};

const rgbOf = (color: string): Rgb => over(color, { r: 0, g: 0, b: 0 });

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const GREY: Rgb = { r: 128, g: 128, b: 128 };

/**
 * Qorong'i ko'rinishdagi ichki bo'lak (glass.muted) - TO'Q chip.
 *
 * Daraja jadvali token alfasini ALMASHTIRADI (0.55..1.0). Ilgari qorong'i
 * muted tusi och slate (148,170,200) edi: u faqat ~7% da ishlardi, jadval
 * esa uni sut rangli plitaga, "Yo'q" da to'liq yopiq och kulrang blokka
 * aylantirardi - profil plitalari, EmptyState doirasi, kalkulyator va PIN
 * klavishlarida matn 1.1-2:1 gacha tushardi. Avval faqat glassSurfaceOnPhoto
 * tekshirilardi, shuning uchun bu ko'rinmay qolgan.
 *
 * Har darajada, rasm bor-yo'qligida, eng yomon fonlarda (qop-qora, oppoq,
 * kulrang rasm; rasmsiz - mavzu foni) ko'z ko'radigan qatlam:
 * fon -> karta (surface) -> ichki bo'lak (muted).
 */
// Quyidagi ikki blok MUZLATISHSIZ yo'lni (telefon; jest - iOS) tekshiradi:
// u yerda ko'rinish rasmga moslashmaydi, shuning uchun eng yomon fonlar
// (qop-qora, oppoq, kulrang) to'g'ridan-to'g'ri qo'yiladi. Web (muzlatish,
// oq xiralik, rasmga mos ko'rinish) photoTone testlarida qulflangan.
describe("telefon: qorong'i shisha - muted har darajada to'q va o'qiladi", () => {
  const colors = darkColors;
  const shadows = makeShadows(colors.shadow);
  const cases = TRANSPARENCY_LEVELS.flatMap(({ id: level }) => [
    ...([['qora rasm', BLACK], ['oq rasm', WHITE], ['kulrang rasm', GREY]] as const).map(
      ([fon, backdrop]) => ({ level, onPhoto: true, fon, backdrop }),
    ),
    { level, onPhoto: false, fon: 'mavzu foni', backdrop: rgbOf(colors.background) },
  ]);

  it.each(cases)('$level, $fon: to\'q va o\'qiladi', ({ level, onPhoto, backdrop }) => {
    const glass = makeGlass(colors, shadows, onPhoto, level, true);
    const card = over(glass.surface.backgroundColor, backdrop);
    const chip = over(glass.muted.backgroundColor, card);

    // Sut rangli plita emas - to'q chip.
    expect(luminance(chip)).toBeLessThanOrEqual(0.08);
    expect(contrastRatio(rgbOf(colors.textPrimary), chip)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(rgbOf(colors.textSecondary), chip)).toBeGreaterThanOrEqual(3);
    // Brand rangidagi yorliq va ikonkalar (profil plitalari, EmptyState) -
    // HAR tanlanadigan asosiy rangda: chip tusi aksentga bog'liq emas.
    for (const accent of ACCENTS) {
      expect(contrastRatio(rgbOf(accent.dark.primary), chip)).toBeGreaterThanOrEqual(3);
    }
  });

  /** Ichki bo'lak karta ichida "ko'tarilgan": qora rasmda ham kartadan to'q emas. */
  it.each(TRANSPARENCY_LEVELS.flatMap(({ id }) => [
    { level: id, onPhoto: true },
    { level: id, onPhoto: false },
  ]))('$level (rasm: $onPhoto): muted kartadan to\'q emas', ({ level, onPhoto }) => {
    const glass = makeGlass(colors, shadows, onPhoto, level, true);
    const card = over(glass.surface.backgroundColor, BLACK);
    const chip = over(glass.muted.backgroundColor, card);

    expect(luminance(chip)).toBeGreaterThanOrEqual(luminance(card));
  });
});

/**
 * Qorong'ida "ko'tarilgan" sirt (summary karta) oddiy kartadan OCH yoki
 * teng - balandlik belgisi shu. Ilgari u kartadan to'q edi va eng muhim
 * karta ekrandagi "qora teshik" bo'lib ko'rinardi. Qora fonda tekshiriladi:
 * u yerda faqat tus va alfa hal qiladi (och rasmda qalinroq to'q sirt
 * tabiiy ravishda to'qroq chiqadi).
 */
describe("telefon: qorong'i shisha - raised kartadan to'q emas", () => {
  const colors = darkColors;
  const shadows = makeShadows(colors.shadow);
  const backdrops = [
    { fon: 'qora', backdrop: BLACK },
    { fon: 'mavzu foni', backdrop: rgbOf(colors.background) },
  ];
  const cases = TRANSPARENCY_LEVELS.flatMap(({ id: level }) =>
    [true, false].flatMap((onPhoto) =>
      backdrops
        .filter(({ fon }) => fon === 'qora' || !onPhoto)
        .map(({ fon, backdrop }) => ({ level, onPhoto, fon, backdrop })),
    ),
  );

  it.each(cases)('$level (rasm: $onPhoto), $fon fon', ({ level, onPhoto, backdrop }) => {
    const glass = makeGlass(colors, shadows, onPhoto, level, true);
    const card = over(glass.surface.backgroundColor, backdrop);
    const raised = over(glass.raised.backgroundColor, backdrop);

    expect(luminance(raised)).toBeGreaterThanOrEqual(luminance(card));
  });
});

/**
 * Qorong'i surfaceMuted - NISBIY ko'tarish (yorug'dagi 5% kabi), tekis
 * rang emas: tekis #1E293B rasm ustidagi muzli to'q kartaga teng chiqib,
 * relsa va chiplar yo'qolardi. Shaffof tus esa ota-sirtdan doim och.
 */
it("qorong'i surfaceMuted nisbiy tus", () => {
  const parsed = parseColor(darkColors.surfaceMuted);
  expect(parsed).not.toBeNull();
  expect(parsed!.a).toBeLessThanOrEqual(0.15);

  // Ota-sirt ustida bir pog'ona OCH: modal va rasm ustidagi yopiq karta.
  const glass = makeGlass(darkColors, makeShadows(darkColors.shadow), true, 'none', true);
  for (const parent of [darkColors.surface, glass.surface.backgroundColor]) {
    const below = over(parent, BLACK);
    expect(luminance(over(darkColors.surfaceMuted, below))).toBeGreaterThan(luminance(below));
  }
});

/**
 * Balans belgisi va StatusBanner matni o'z yumshoq fonida turadi:
 * qizil ham, yashil ham AA (4.5) dan past tushmasligi SHART. Qorong'i
 * negativeSoft to'yinganroq qilingani uchun bu chegara qulflanadi.
 */
describe("moliyaviy ranglar o'z fonida o'qiladi", () => {
  it.each(themes)('%s mavzuda', (_name, colors) => {
    const pairs = [
      [colors.negative, colors.negativeSoft],
      [colors.positive, colors.positiveSoft],
      [colors.danger, colors.dangerMuted],
    ] as const;
    for (const [fg, bg] of pairs) {
      expect(contrastRatio(rgbOf(fg), rgbOf(bg))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
