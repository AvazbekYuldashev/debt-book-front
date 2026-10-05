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

const WITH_PHOTO: Record<TransparencyLevel, AlphaSet> = {
  clear: { surface: 0.45, strong: 0.6, muted: 0.35 },
  medium: { surface: 0.72, strong: 0.82, muted: 0.65 },
  solid: { surface: 0.92, strong: 0.96, muted: 0.88 },
};

/** Noma'lum daraja standartga tushadi - eski ilova yangisini yuborsa ham. */
export const findTransparency = (id: string | null | undefined): TransparencyLevel =>
  TRANSPARENCY_LEVELS.some((item) => item.id === id)
    ? (id as TransparencyLevel)
    : DEFAULT_TRANSPARENCY;

export const glassAlpha = (level: TransparencyLevel, onPhoto: boolean): AlphaSet =>
  (onPhoto ? WITH_PHOTO : WITHOUT_PHOTO)[level];

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
