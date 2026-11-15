import type { PageResponse } from '../../../shared/types/money';
import type { NotificationDTO } from '../types/notification';

type Page = PageResponse<NotificationDTO>;

/**
 * Ro'yxat sahifasi ustidagi sof o'zgartirishlar.
 *
 * Bular kesh uchun: xabar o'qilgan deb belgilanganda u o'qilmaganlardan
 * DARHOL chiqib, o'qilganlarga DARHOL qo'shilishi kerak — server javobini
 * kutib turish "bosdim, lekin hech narsa bo'lmadi" hissini beradi.
 *
 * Sof funksiya sifatida ajratilgan: sanoq (`totalElements`) va tartib bilan
 * adashish oson, React'siz sinash esa arzon.
 */

/** Sahifadan elementni olib tashlaydi va umumiy sanoqni kamaytiradi. */
export function removeFromPage(page: Page | undefined, id: string): Page | undefined {
  if (!page) return page;
  const content = page.content.filter((item) => item.id !== id);
  if (content.length === page.content.length) return page;
  return { ...page, content, totalElements: Math.max(0, page.totalElements - 1) };
}

/**
 * Elementni sahifaga qo'shadi (sana bo'yicha kamayish tartibida) va sanoqni
 * oshiradi. Allaqachon bor bo'lsa — tegilmaydi, ikki nusxa chiqmasin.
 */
export function insertIntoPage(page: Page | undefined, item: NotificationDTO): Page | undefined {
  if (!page) return page;
  if (page.content.some((existing) => existing.id === item.id)) return page;

  const content = [...page.content, item].sort((a, b) => toTime(b.createdDate) - toTime(a.createdDate));
  return { ...page, content, totalElements: page.totalElements + 1 };
}

/** Sahifadagi bitta elementni o'qilgan deb belgilaydi (aralash ro'yxat uchun). */
export function markReadInPage(page: Page | undefined, id: string): Page | undefined {
  if (!page) return page;
  return {
    ...page,
    content: page.content.map((item) => (item.id === id ? { ...item, read: true } : item)),
  };
}


// Sana yo'q/buzuq bo'lsa ro'yxat oxiriga tushadi, tartib buzilmaydi.
const toTime = (value?: string): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
