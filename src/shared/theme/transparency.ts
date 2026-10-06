/**
 * Sirtlarning shaffoflik darajasi.
 *
 * NEGA SOZLAMA: to'g'ri qiymat FONGA bog'liq va uni dastur bila olmaydi.
 * Tinch, bir xil rasmda sirt deyarli ko'rinmas bo'lsa chiroyli; shovqinli
 * yoki kontrastli rasmda esa o'sha qiymat matnni o'qib bo'lmas qiladi.
 * Shuning uchun tanlov foydalanuvchida.
 */
export type TransparencyLevel = 'none' | 'solid' | 'medium' | 'clear';

/**
 * Tartib "Xiralik" bilan bir xil - Yo'q -> Kam -> O'rta -> Ko'p: ikki
 * qo'shni sozlama teskari tartibda tursa, odam adashardi.
 *
 * "Yo'q" - shaffoflik umuman yo'q: kartalar fonni to'liq yopadi, rasm
 * faqat ular ORASIDA ko'rinadi.
 */
export const TRANSPARENCY_LEVELS: { id: TransparencyLevel; labelKey: string }[] = [
  { id: 'none', labelKey: 'glass.none' },
  { id: 'solid', labelKey: 'glass.solid' },
  { id: 'medium', labelKey: 'glass.medium' },
  { id: 'clear', labelKey: 'glass.clear' },
];

export const DEFAULT_TRANSPARENCY: TransparencyLevel = 'medium';

interface AlphaSet {
  surface: number;
  strong: number;
  muted: number;
}

/** "Yo'q": shaffoflik yo'q - sirt to'liq yopiq. */
const OPAQUE: AlphaSet = { surface: 1, strong: 1, muted: 1 };

/**
 * Shaffoflik ikki holatda butunlay boshqacha bo'lishi kerak.
 *
 * Ilovaning O'Z bezakli foni past kontrastli va och - u yerda sirt juda
 * shaffof bo'lsa ham matn o'qiladi. Ixtiyoriy FOTOSURAT esa bunday
 * emas: to'q yoki shovqinli rasm ustida o'sha qiymat matnni yeb
 * qo'yadi. Shu sababli har daraja uchun ikki jadval.
 */
const WITHOUT_PHOTO_LIGHT: Record<TransparencyLevel, AlphaSet> = {
  none: OPAQUE,
  clear: { surface: 0.18, strong: 0.3, muted: 0.12 },
  medium: { surface: 0.28, strong: 0.44, muted: 0.2 },
  solid: { surface: 0.55, strong: 0.7, muted: 0.4 },
};

/**
 * Rasmsiz QORONG'I: surface/strong yorug' bilan bir xil, muted ATAYIN
 * qalinroq.
 *
 * Qorong'i muted tusi endi TO'Q chip (colors.ts glassMuted) - kartadan
 * bir pog'ona och. Yorug'dagi kabi 0.12-0.4 da u to'q fon ustida deyarli
 * ko'rinmasdi: ichki bo'lak (klavisha, chip) ota-kartadan ajralmasdi.
 * Ilgari bu yerda och slate turardi va past alfa "ko'tarish" berardi;
 * endi o'sha ko'tarishni to'q rgb yuqori alfada beradi - natija "Ko'p"
 * da avvalgisiga deyarli teng, "Kam" da esa sut rangli emas.
 */
const WITHOUT_PHOTO_DARK: Record<TransparencyLevel, AlphaSet> = {
  none: OPAQUE,
  clear: { surface: 0.18, strong: 0.3, muted: 0.55 },
  medium: { surface: 0.28, strong: 0.44, muted: 0.65 },
  solid: { surface: 0.55, strong: 0.7, muted: 0.8 },
};

/**
 * FOTOSURAT ustida: Samsung (One UI) papka va bildirishnomalari kabi
 * MUZLI SHISHA.
 *
 * Shaffoflik faqat elementlarga tegishli: fon rasmi "Xiralik" bo'yicha
 * keskin ham qolishi mumkin, sirt esa ortidagi rasmni o'zi xiralashtiradi
 * (web'da backdrop-filter - glass.ts). Rasmning detallari matnga xalaqit
 * bermaydi, faqat ranglari o'tib turadi.
 *
 * Har darajada, har ikki mavzuda, HAR QANDAY rasmda asosiy matn 4.5:1,
 * kulrang matn 3:1 dan o'tadi - blur'siz ham (telefonda backdrop-filter
 * yo'q). Test buni qop-qora va oppoq rasmda qulflaydi.
 */
const WITH_PHOTO_LIGHT: Record<TransparencyLevel, AlphaSet> = {
  none: OPAQUE,
  solid: { surface: 0.92, strong: 0.95, muted: 0.88 },
  medium: { surface: 0.82, strong: 0.88, muted: 0.76 },
  clear: { surface: 0.7, strong: 0.78, muted: 0.62 },
};

/** Qorong'ida - Samsung tez sozlamalar plitalari kabi to'q muzli shisha. */
const WITH_PHOTO_DARK: Record<TransparencyLevel, AlphaSet> = {
  none: OPAQUE,
  solid: { surface: 0.92, strong: 0.95, muted: 0.88 },
  medium: { surface: 0.85, strong: 0.9, muted: 0.8 },
  clear: { surface: 0.78, strong: 0.84, muted: 0.7 },
};

/** Noma'lum daraja standartga tushadi - eski ilova yangisini yuborsa ham. */
export const findTransparency = (id: string | null | undefined): TransparencyLevel =>
  TRANSPARENCY_LEVELS.some((item) => item.id === id)
    ? (id as TransparencyLevel)
    : DEFAULT_TRANSPARENCY;

export const glassAlpha = (
  level: TransparencyLevel,
  onPhoto: boolean,
  isDark = false,
): AlphaSet => {
  if (!onPhoto) return (isDark ? WITHOUT_PHOTO_DARK : WITHOUT_PHOTO_LIGHT)[level];
  return (isDark ? WITH_PHOTO_DARK : WITH_PHOTO_LIGHT)[level];
};

/**
 * `rgba(...)` satrining faqat ALFASINI almashtiradi.
 *
 * Tusni (rgb) mavzu beradi - yorug'da oq, qorong'ida sovuq kulrang-ko'k.
 * Daraja esa faqat shaffoflikni boshqaradi, ya'ni rang o'zgarmaydi.
 *
 * Mos kelmagan satr O'Z HOLICHA qaytadi: token noto'g'ri yozilgan bo'lsa
 * ham sirt chizilishi kerak, buziq rang butun ekranni yo'qotib
 * yubormasligi lozim.
 */
export const reAlpha = (rgba: string, alpha: number): string => {
  const match = /^rgba\(\s*([^,]+,[^,]+,[^,]+),\s*[\d.]+\s*\)$/.exec(rgba);
  return match ? `rgba(${match[1]}, ${alpha})` : rgba;
};
