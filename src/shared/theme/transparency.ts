/**
 * Sirtlarning shaffoflik darajasi.
 *
 * NEGA SOZLAMA: to'g'ri qiymat FONGA bog'liq va uni dastur bila olmaydi.
 * Tinch, bir xil rasmda sirt deyarli ko'rinmas bo'lsa chiroyli; shovqinli
 * yoki kontrastli rasmda esa o'sha qiymat matnni o'qib bo'lmas qiladi.
 * Shuning uchun tanlov foydalanuvchida.
 */
export type TransparencyLevel = 'clear' | 'medium' | 'solid';

export const TRANSPARENCY_LEVELS: { id: TransparencyLevel; labelKey: string }[] = [
  { id: 'clear', labelKey: 'glass.clear' },
  { id: 'medium', labelKey: 'glass.medium' },
  { id: 'solid', labelKey: 'glass.solid' },
];

export const DEFAULT_TRANSPARENCY: TransparencyLevel = 'medium';

interface AlphaSet {
  surface: number;
  strong: number;
  muted: number;
}

/**
 * Shaffoflik ikki holatda butunlay boshqacha bo'lishi kerak.
 *
 * Ilovaning O'Z bezakli foni past kontrastli va och - u yerda sirt juda
 * shaffof bo'lsa ham matn o'qiladi. Ixtiyoriy FOTOSURAT esa bunday
 * emas: to'q yoki shovqinli rasm ustida o'sha qiymat matnni yeb
 * qo'yadi. Shu sababli har daraja uchun ikki jadval.
 */
const WITHOUT_PHOTO: Record<TransparencyLevel, AlphaSet> = {
  clear: { surface: 0.18, strong: 0.3, muted: 0.12 },
  medium: { surface: 0.28, strong: 0.44, muted: 0.2 },
  solid: { surface: 0.55, strong: 0.7, muted: 0.4 },
};

/**
 * FOTOSURAT ustida: Samsung (One UI) bildirishnoma kartalari kabi.
 *
 * Fon rasmi DOIM xiralashtiriladi (backgroundSettings.PHOTO_BLUR). Shu
 * sababli yarim shaffof sirt endi "sut rangli tuman" emas, MUZLI SHISHA
 * bo'lib ko'rinadi: ostidagi rasmning detallari yo'q, faqat ranglari bor.
 * Tuman keskin rasm ustida paydo bo'lardi - blur uni yo'qotdi.
 *
 * Har darajada mavzu matni HAR QANDAY rasmda o'qiladi, ya'ni mavzu
 * almashmaydi: yorug' rejim to'q fonda ham yorug' qoladi - Samsung'dagidek.
 * Ilgari "Ko'p" 0.08 edi, matn rasmning o'zida turardi va ilova to'q
 * rasmda tungi ko'rinishga o'tib ketardi - bu kutilmagan "farq" edi.
 *
 * Eng past chegaralar o'lchangan (qop-qora / oppoq rasmda ham kulrang
 * matn 3:1 dan, asosiy matn 4.5:1 dan o'tishi kerak). Test shuni qulflaydi.
 */
const WITH_PHOTO_LIGHT: Record<TransparencyLevel, AlphaSet> = {
  clear: { surface: 0.7, strong: 0.78, muted: 0.62 },
  medium: { surface: 0.84, strong: 0.9, muted: 0.78 },
  solid: { surface: 0.96, strong: 0.98, muted: 0.94 },
};

/** Qorong'ida - Samsung tez sozlamalar plitalari kabi to'q muzli shisha. */
const WITH_PHOTO_DARK: Record<TransparencyLevel, AlphaSet> = {
  clear: { surface: 0.78, strong: 0.84, muted: 0.7 },
  medium: { surface: 0.86, strong: 0.9, muted: 0.8 },
  solid: { surface: 0.94, strong: 0.96, muted: 0.9 },
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
  if (!onPhoto) return WITHOUT_PHOTO[level];
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
