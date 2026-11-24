import type { QueryClient } from '@tanstack/react-query';

// ============================================================
//  OFLAYNDA KIRITILGAN YOZUV — DARHOL KO'RINADI.
//
//  Odam amal bajardi, internet yo'q. Amal navbatga tushadi, lekin
//  ekranda hech narsa o'zgarmasa, u "bajarilmadi shekilli" deb o'ylab
//  qayta kiritardi — internet qaytganda esa ikkita yozuv paydo
//  bo'lardi. Shuning uchun yozuv ro'yxatga DARHOL qo'shiladi va soat
//  belgisi bilan turadi, xuddi yuborilmagan xabar kabi.
//
//  Vaqtinchalik yozuvning id'si ALOHIDA ko'rinishda bo'ladi: amal
//  serverga yetgach uni keshdan topib olib tashlash kerak. Aks holda
//  server bergan haqiqiy yozuv vaqtinchaliknning YONIDA turib qolar
//  va odam bitta amalni ikkita bo'lib ko'rardi.
// ============================================================

const PREFIX = 'pending:';

/** Oflayn amal uchun vaqtinchalik id — navbatdagi kalitdan yasaladi. */
export const pendingId = (key: string): string => `${PREFIX}${key}`;

/** Ro'yxatdan bitta id'ni olib tashlaydi; o'zgarish bo'lmasa `null`. */
const withoutId = <T extends { id?: string }>(items: T[], id: string): T[] | null =>
  items.some((item) => item?.id === id) ? items.filter((item) => item?.id !== id) : null;

/**
 * Vaqtinchalik yozuvni BARCHA keshlardan olib tashlaydi.
 *
 * Nima uchun hammasini ko'radi: bitta amal bir nechta ro'yxatda
 * ko'rinishi mumkin (masalan kategoriya ro'yxati va uning tafsiloti),
 * vaqtinchalik id esa yagona — qayerda uchrasa ham o'sha amalga
 * tegishli. Ro'yxat ikki shaklda bo'ladi: oddiy massiv yoki sahifa
 * ko'rinishidagi `{ content }`.
 */
export const dropPendingEverywhere = (queryClient: QueryClient, key: string): void => {
  const id = pendingId(key);
  queryClient
    .getQueryCache()
    .getAll()
    .forEach((query) => {
      const data = query.state.data as unknown;

      if (Array.isArray(data)) {
        const next = withoutId(data as { id?: string }[], id);
        if (next) queryClient.setQueryData(query.queryKey, next);
        return;
      }

      const content = (data as { content?: unknown } | undefined)?.content;
      if (Array.isArray(content)) {
        const next = withoutId(content as { id?: string }[], id);
        if (next) queryClient.setQueryData(query.queryKey, { ...(data as object), content: next });
      }
    });
};
