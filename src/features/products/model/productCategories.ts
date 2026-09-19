/**
 * Mahsulotlar ro'yxatidan kategoriya filtri yasash.
 *
 * Nega kategoriyalar SERVERDAN alohida so'ralmaydi: mijoz begona biznesning
 * narxnomasini ko'rayapti, `/category` endpointi esa KO'RUVCHINING o'z ish
 * maydonidagi kategoriyalarni qaytaradi — boshqa biznesnikini emas. Mahsulot
 * javobida kategoriya nomi allaqachon bor, shuning uchun filtr shundan
 * quriladi: qo'shimcha so'rov ham, ruxsat muammosi ham yo'q.
 *
 * Sof funksiyalar: React'siz sinaladi.
 */

interface Categorized {
  categoryId?: string | null;
  categoryName?: string | null;
}

/** "Hammasi" — filtr o'chiq. */
export const ALL_CATEGORIES = '';

/** Kategoriyasiz mahsulotlar uchun maxsus qiymat (bo'sh satrdan farqli). */
export const UNCATEGORIZED = '__uncategorized__';

export interface CategoryOption {
  id: string;
  name: string;
}

const cleanId = (item: Categorized): string => (item.categoryId ?? '').trim();
const cleanName = (item: Categorized): string => (item.categoryName ?? '').trim();

/** Kategoriyasi bor deb hisoblanadimi (id ham, nom ham bo'lishi shart). */
function hasCategory(item: Categorized): boolean {
  return cleanId(item).length > 0 && cleanName(item).length > 0;
}

/**
 * Ro'yxatdagi kategoriyalar, birinchi uchrash tartibida.
 *
 * Kategoriyasizlar bo'lsa oxiriga alohida variant qo'shiladi. BITTA guruh
 * chiqsa bo'sh massiv qaytadi: yolg'iz chip hech narsani filtrlamaydi,
 * faqat joy egallaydi.
 */
export function categoriesFromProducts<T extends Categorized>(
  items: T[],
  uncategorizedLabel: string,
): CategoryOption[] {
  const options: CategoryOption[] = [];
  const seen = new Set<string>();
  let hasUncategorized = false;

  for (const item of items) {
    if (!hasCategory(item)) {
      hasUncategorized = true;
      continue;
    }
    const id = cleanId(item);
    if (seen.has(id)) continue;
    seen.add(id);
    options.push({ id, name: cleanName(item) });
  }

  if (hasUncategorized && options.length > 0) {
    options.push({ id: UNCATEGORIZED, name: uncategorizedLabel });
  }

  // Bitta guruh — filtrning ma'nosi yo'q.
  return options.length > 1 ? options : [];
}

/** Mahsulot tanlangan kategoriyaga mos keladimi. */
export function matchesCategory(item: Categorized, categoryId: string): boolean {
  if (categoryId === ALL_CATEGORIES) return true;
  if (categoryId === UNCATEGORIZED) return !hasCategory(item);
  return hasCategory(item) && cleanId(item) === categoryId;
}
