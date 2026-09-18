/**
 * Narxnomani kategoriyalarga bo'lish.
 *
 * Sof funksiya: React'siz sinaladi. Bu yerda adashish darhol ko'rinadi —
 * mahsulot noto'g'ri guruhga tushadi yoki umuman yo'qoladi.
 */

interface Categorized {
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface ProductSection<T> {
  /** Kategoriya id'si; kategoriyasizlar uchun bo'sh satr. */
  id: string;
  title: string;
  data: T[];
}

/**
 * Mahsulotlarni kategoriya bo'yicha guruhlaydi.
 *
 * Ikkita tartib qoidasi:
 *  1. Guruh ICHIDA tartib TEGILMAYDI — server ro'yxatni xarid tarixi
 *     bo'yicha tartiblab yuboradi ("men ko'p olgan narsa tepada"), uni
 *     alifbo bo'yicha qayta saralash o'sha foydani yo'qotardi.
 *  2. Guruhlar ham birinchi uchrash tartibida — ya'ni eng ko'p olingan
 *     mahsulot qaysi kategoriyada bo'lsa, o'sha kategoriya tepada turadi.
 *
 * Kategoriyasiz mahsulotlar HAR DOIM oxirgi guruhda: ular yo'qolib
 * qolmasligi kerak, lekin nomi bor kategoriyalardan keyin turgani mantiqiy.
 */
export function groupByCategory<T extends Categorized>(
  items: T[],
  uncategorizedTitle: string,
): ProductSection<T>[] {
  const sections: ProductSection<T>[] = [];
  const byId = new Map<string, ProductSection<T>>();
  const uncategorized: T[] = [];

  for (const item of items) {
    const id = (item.categoryId ?? '').trim();
    // Nomi yo'q kategoriya (o'chirilgan yoki server nom yubormagan) —
    // id'siz bilan bir xil muomala: "boshqa" guruhiga.
    const name = (item.categoryName ?? '').trim();
    if (!id || !name) {
      uncategorized.push(item);
      continue;
    }

    let section = byId.get(id);
    if (!section) {
      section = { id, title: name, data: [] };
      byId.set(id, section);
      sections.push(section);
    }
    section.data.push(item);
  }

  if (uncategorized.length > 0) {
    sections.push({ id: '', title: uncategorizedTitle, data: uncategorized });
  }
  return sections;
}
