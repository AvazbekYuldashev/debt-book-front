import type { ColorTokens } from './colors';

/**
 * Ilovaning asosiy (brand) rangi.
 *
 * Telegram'dagi kabi: odam BITTA rang tanlaydi va butun ilova shunga
 * bo'yaladi. Har elementni alohida sozlash emas - ilovada brand rangi
 * 67 ta faylda `colors.primary` orqali o'qiladi, demak tokenni mavzu
 * darajasida almashtirish kifoya.
 *
 * TAYYOR TANLOV, erkin rang tanlagich emas. Ixtiyoriy rangda matn
 * kontrasti ham, qorong'i mavzudagi ko'rinish ham kafolatlanmaydi:
 * och sariq tugmada oq yozuv o'qilmay qoladi. Har tanlov esa ikkala
 * mavzu uchun alohida tanlangan va tekshirilgan.
 */
export interface AccentPreset {
  id: string;
  /** i18n kaliti - rang nomi uch tilda. */
  labelKey: string;
  light: AccentShades;
  dark: AccentShades;
}

interface AccentShades {
  /** Asosiy rang: tugmalar, faol holat, ikonkalar. */
  primary: string;
  /** Bosilgan holat - asosiydan bir daraja quyuq. */
  pressed: string;
  /** Yumshoq fon: belgi doirasi, chip. */
  soft: string;
  /** Asosiy harakat tugmasi gradientining boshi. */
  gradientStart: string;
  /** Gradient ustidagi matn - har rangda alohida tekshirilgan. */
  onGradient: string;
}

/**
 * QIZIL VA YASHIL ATAYIN CHEKLANGAN.
 *
 * Ilovada rang ma'no tashiydi: qarz qizil, haq yashil. Brand rangi
 * ulardan biriga juda yaqin bo'lsa, odam tugmani balans deb o'qishi
 * mumkin. Shuning uchun qizil umuman yo'q, yashil esa faqat standart
 * variant sifatida - u ilovaning o'z rangi va odam unga ko'nikkan.
 */
export const ACCENTS: AccentPreset[] = [
  {
    id: 'green',
    labelKey: 'accent.green',
    light: { primary: '#15803D', pressed: '#116632', soft: '#EBF7EF', gradientStart: '#2DD4A7', onGradient: '#FFFFFF' },
    dark: { primary: '#4ADE80', pressed: '#22C55E', soft: '#14532D', gradientStart: '#34D399', onGradient: '#04221A' },
  },
  {
    id: 'blue',
    labelKey: 'accent.blue',
    light: { primary: '#1D4ED8', pressed: '#1A3FAF', soft: '#E8EEFD', gradientStart: '#38BDF8', onGradient: '#FFFFFF' },
    dark: { primary: '#60A5FA', pressed: '#3B82F6', soft: '#16305C', gradientStart: '#7DD3FC', onGradient: '#07203F' },
  },
  {
    id: 'teal',
    labelKey: 'accent.teal',
    light: { primary: '#0F766E', pressed: '#0B5A54', soft: '#E3F5F3', gradientStart: '#2DD4BF', onGradient: '#FFFFFF' },
    dark: { primary: '#2DD4BF', pressed: '#14B8A6', soft: '#124A45', gradientStart: '#5EEAD4', onGradient: '#032B28' },
  },
  {
    id: 'indigo',
    labelKey: 'accent.indigo',
    light: { primary: '#4338CA', pressed: '#372DA6', soft: '#ECEAFC', gradientStart: '#818CF8', onGradient: '#FFFFFF' },
    dark: { primary: '#A5B4FC', pressed: '#818CF8', soft: '#272159', gradientStart: '#C7D2FE', onGradient: '#161043' },
  },
  {
    id: 'violet',
    labelKey: 'accent.violet',
    light: { primary: '#7E22CE', pressed: '#671BA8', soft: '#F5EAFD', gradientStart: '#C084FC', onGradient: '#FFFFFF' },
    dark: { primary: '#C084FC', pressed: '#A855F7', soft: '#43176B', gradientStart: '#D8B4FE', onGradient: '#2B0A47' },
  },
  {
    id: 'amber',
    labelKey: 'accent.amber',
    light: { primary: '#B45309', pressed: '#8F4107', soft: '#FDF0E1', gradientStart: '#FBBF24', onGradient: '#FFFFFF' },
    dark: { primary: '#FBBF24', pressed: '#F59E0B', soft: '#4A2E07', gradientStart: '#FCD34D', onGradient: '#301D02' },
  },
];

export const DEFAULT_ACCENT = 'green';

/** Noma'lum belgi standartga tushadi - eski ilova yangi rang yuborsa ham. */
export const findAccent = (id: string | null | undefined): AccentPreset =>
  ACCENTS.find((item) => item.id === id) ?? ACCENTS[0];

/**
 * `#RRGGBB` ni `rgba(r, g, b, a)` ga aylantiradi.
 *
 * Shaffof tuslar (shisha ustidagi brand tusi, ambient yuvindi) alfa
 * bilan beriladi va ular ham asosiy rangdan kelib chiqishi kerak -
 * aks holda tugma ko'k bo'lib, fon yashil bo'lib qolardi.
 */
export const withAlpha = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Tanlangan rangni mavzu tokenlariga qo'llaydi.
 *
 * MOLIYAVIY RANGLAR TEGILMAYDI. `positive` va `negative` qarz bilan
 * haqni ajratadi - ular brand emas, MA'NO. Brand rangi almashganda
 * ular ham almashsa, ko'k rang tanlagan odam qarzni haqdan ajrata
 * olmay qolardi.
 *
 * Sof funksiya: kirish tokenlari o'zgarmaydi, yangi nusxa qaytadi.
 */
export const applyAccent = (
  colors: ColorTokens,
  accentId: string | null | undefined,
  isDark: boolean,
): ColorTokens => {
  const accent = findAccent(accentId);
  const shades = isDark ? accent.dark : accent.light;

  return {
    ...colors,
    primary: shades.primary,
    primaryPressed: shades.pressed,
    primarySoft: shades.soft,
    // Shisha ustidagi brand tusi va ambient yuvindi ham asosiy rangdan:
    // aks holda tugma yangi rangda, fon esa eskisida qolardi.
    glassPrimarySoft: withAlpha(shades.primary, isDark ? 0.14 : 0.1),
    ambientGreen: withAlpha(shades.primary, 0.05),
    ctaGradientStart: shades.gradientStart,
    ctaGradientEnd: shades.primary,
    ctaText: shades.onGradient,
  };
};
