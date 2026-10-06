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
 * FOTOSURAT ustida mavzular TENG EMAS.
 *
 * Yorug' mavzuda sirt OQ, qorong'ida esa to'q ko'k-kulrang. To'q rasm
 * ustida oq rangning O'RTA alfasi sut rangli tuman beradi - rasm ham
 * ko'rinmaydi, karta ham toza emas. To'q tus esa rasmning o'ziga
 * qo'shilib ketadi va o'rta alfada ham tabiiy chiqadi.
 *
 * Shu sababli yorug' mavzuda o'sha "loyqa" oraliqdan QOCHILADI: "Ko'p"
 * deyarli nolga tushadi (rasm o'z holicha ko'rinadi), "Kam" esa toza
 * oq kartaga chiqadi. O'rtadagi qiymat ikkala uchdan ham uzoqroq.
 *
 * "Ko'p" da sirt matnga fon bermaydi va yorug' mavzudagi to'q matn to'q
 * rasm ustida qolardi. Buni sirt emas, MAVZU hal qiladi: rasm o'lchanadi
 * va matn o'qilmasa, o'qiladigan mavzu ko'rsatiladi (photoTone.ts).
 */
const WITH_PHOTO_LIGHT: Record<TransparencyLevel, AlphaSet> = {
  clear: { surface: 0.08, strong: 0.14, muted: 0.06 },
  medium: { surface: 0.5, strong: 0.62, muted: 0.42 },
  solid: { surface: 0.95, strong: 0.97, muted: 0.92 },
};

const WITH_PHOTO_DARK: Record<TransparencyLevel, AlphaSet> = {
  clear: { surface: 0.08, strong: 0.14, muted: 0.06 },
  medium: { surface: 0.45, strong: 0.6, muted: 0.38 },
  solid: { surface: 0.85, strong: 0.92, muted: 0.8 },
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
