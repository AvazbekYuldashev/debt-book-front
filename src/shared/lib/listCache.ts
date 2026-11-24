import type { QueryClient } from '@tanstack/react-query';

// ============================================================
//  RO'YXAT KESHINI QO'LDA O'ZGARTIRISH.
//
//  Oflayn amal darhol ko'rinishi uchun ro'yxat keshi joyida
//  o'zgartiriladi. Faqat ekran holati emas, KESH o'zgaradi: odam
//  boshqa ekranga o'tib qaytsa yoki ilovani yopib ochsa ham yozuv
//  joyida turishi kerak.
// ============================================================

/** Yozuvni ro'yxat keshining boshiga qo'yadi (eng yangisi tepada). */
export const prependToCache = <T>(queryClient: QueryClient, key: unknown[], item: T): void => {
  const current = queryClient.getQueryData<T[]>(key) ?? [];
  queryClient.setQueryData<T[]>(key, [item, ...current]);
};

/**
 * Yozuvni ro'yxat keshidan olib tashlaydi.
 *
 * Kesh bo'sh bo'lsa HECH NARSA yozilmaydi: aks holda bu yerda bo'sh
 * ro'yxat paydo bo'lar va "ma'lumot yo'q" degan ma'noni berardi.
 */
export const removeFromCache = (
  queryClient: QueryClient,
  key: unknown[],
  id: string,
): void => {
  const current = queryClient.getQueryData<{ id: string }[]>(key);
  if (!current) return;
  queryClient.setQueryData(
    key,
    current.filter((item) => item.id !== id),
  );
};
