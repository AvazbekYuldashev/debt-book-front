import { makeGlass } from '../glass';
import { darkColors, lightColors } from '../colors';
import { makeShadows } from '../elevation';
import { ACCENTS } from '../accent';
import { TRANSPARENCY_LEVELS } from '../transparency';
import { contrastRatio, luminance, mix, parseColor, type Rgb } from '../colorMath';

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
 * FON RASMI SIRTLARGA TEGMAYDI.
 *
 * Ilgari tegardi: rasm ustida sirtlar quyuqlashar, backdrop-filter bilan
 * muzlatilar va tus ostiga oq xiralik qo'yilardi - maqsad shovqinli rasmda
 * matnni o'qitish edi. Natijada esa rasm qo'yilgan ilova rasmsizidan
 * butunlay boshqacha, sut rangli va so'nik ko'rinardi.
 *
 * Endi ikkovi bir xil. O'qilishni faqat DARAJA boshqaradi: shovqinli
 * rasmda "O'rta" yoki "Kam" tanlanadi - bu foydalanuvchi tanlovi.
 */
describe('makeGlass - fon rasmi ustida', () => {
  it('rasm sirtlarni ozgartirmaydi', () => {
    for (const [, palette] of themes) {
      const isDark = palette === darkColors;
      const shadows = makeShadows(palette.shadow);
      for (const { id } of TRANSPARENCY_LEVELS) {
        const oddiy = makeGlass(palette, shadows, false, id, isDark);
        const rasmda = makeGlass(palette, shadows, true, id, isDark);
        expect([id, isDark, rasmda]).toEqual([id, isDark, oddiy]);
      }
    }
  });

  /** Muzlatish (backdrop-filter) shaffof sirtlarda umuman qolmagan - web'da ham. */
  it('rasm ustida muzlatish yoq', () => {
    const { Platform } = require('react-native');
    const original = Platform.OS;
    Platform.OS = 'web';
    try {
      const glass = makeGlass(lightColors, makeShadows(lightColors.shadow), true, 'clear');
      for (const key of ['surface', 'pane', 'flush', 'muted'] as const) {
        expect([key, (glass[key] as Record<string, unknown>).backdropFilter]).toEqual([key, undefined]);
      }
    } finally {
      Platform.OS = original;
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
// Quyidagi ikki blok eng yomon fonlarni (qop-qora, oppoq, kulrang)
// to'g'ridan-to'g'ri qo'yadi: endi web bilan telefon o'rtasida farq yo'q -
// muzlatish ham, rasmga moslashish ham olib tashlangan.
describe("telefon: qorong'i shisha - muted har darajada to'q va o'qiladi", () => {
  const colors = darkColors;
  const shadows = makeShadows(colors.shadow);
  /**
   * FOTOSURAT faqat YOPIQ darajalarda ("Yo'q", "Kam") tekshiriladi.
   *
   * "O'rta" va "Ko'p" da sirt ataylab deyarli shaffof: ortidagi rasm
   * ko'rinadi va och rasmda tungi chip ham oqarib ketadi. Ilgari buni
   * o'lchangan chegara (photoFloor) va oq xiralik to'sardi, lekin o'sha
   * himoya rasm qo'yilgan ilovani sut rangli qilib qo'yardi -
   * foydalanuvchi uni rad etdi va shaffoflikni O'ZI tanlashni so'radi.
   *
   * Shuning uchun shaffof darajalarda rasm ustidagi kontrast endi DASTUR
   * KAFOLATI emas: shovqinli rasmda "Kam" yoki "O'rta" tanlanadi. Ilovaning
   * O'Z foni esa har darajada kafolat bo'lib qoladi - u past kontrastli.
   */
  const COVERING = ['none', 'solid'] as const;
  const cases = TRANSPARENCY_LEVELS.flatMap(({ id: level }) => [
    ...(COVERING.includes(level as typeof COVERING[number])
      ? ([['qora rasm', BLACK], ['oq rasm', WHITE], ['kulrang rasm', GREY]] as const).map(
          ([fon, backdrop]) => ({ level, onPhoto: true, fon, backdrop }),
        )
      : []),
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
