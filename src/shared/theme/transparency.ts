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
 * Shaffoflik FON RASMIGA BOG'LIQ EMAS - bitta jadval.
 *
 * Bir muddat rasm ustida alohida jadval, oq xiralik (FROST_HAZE),
 * yorqinlik tuzatishi va o'lchangan chegara (photoFloor) ishlatilardi:
 * maqsad shovqinli rasm ustida matnni o'qitish edi. Natijada esa rasm
 * qo'yilgan ilova rasmsizidan butunlay boshqacha - sut rangli, so'nik -
 * ko'rinardi. Foydalanuvchi aynan shuni rad etdi: shaffoflik rasm bor
 * yoki yo'qligidan qat'i nazar bir xil bo'lsin.
 *
 * O'qilish endi faqat DARAJA bilan boshqariladi: shovqinli rasmda "O'rta"
 * yoki "Kam" tanlanadi. Bu tanlov foydalanuvchida - dastur o'zi
 * qalinlashtirib qo'ymaydi.
 */
const LIGHT: Record<TransparencyLevel, AlphaSet> = {
  none: OPAQUE,
  // "Ko'p" - to'liq shaffof: karta faqat chegarasi va soyasi bilan ajraladi.
  // Ichki bo'lak (chip, klavisha) ozgina tusda qoladi - aks holda u
  // shaffof karta ichida butunlay yo'qolardi.
  clear: { surface: 0, strong: 0, muted: 0.12 },
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
const DARK: Record<TransparencyLevel, AlphaSet> = {
  none: OPAQUE,
  clear: { surface: 0, strong: 0, muted: 0.55 },
  medium: { surface: 0.28, strong: 0.44, muted: 0.65 },
  solid: { surface: 0.55, strong: 0.7, muted: 0.8 },
};

/** Noma'lum daraja standartga tushadi - eski ilova yangisini yuborsa ham. */
export const findTransparency = (id: string | null | undefined): TransparencyLevel =>
  TRANSPARENCY_LEVELS.some((item) => item.id === id)
    ? (id as TransparencyLevel)
    : DEFAULT_TRANSPARENCY;

/**
 * Daraja -> sirt alfasi. Fon rasmi bu yerda HECH NARSANI o'zgartirmaydi:
 * rasm qo'yilgan ilova rasmsizi bilan bir xil ko'rinadi.
 */
export const glassAlpha = (level: TransparencyLevel, isDark = false): AlphaSet =>
  (isDark ? DARK : LIGHT)[level];

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
