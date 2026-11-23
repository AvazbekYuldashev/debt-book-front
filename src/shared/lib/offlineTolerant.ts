import { isQueuedOffline } from '../api/apiClient';

/**
 * Mutatsiyani oflaynga CHIDAMLI qiladi.
 *
 * Tarmoqsiz paytda yozuv amali navbatga tushadi va `apiClient`
 * `OfflineQueuedError` qaytaradi. React Query uchun bu xato bo'lib
 * ko'rinadi: `onSuccess` ishlamaydi, modal yopilmaydi, ekranda qizil
 * xabar chiqadi. Holbuki amal YO'QOLMAGAN — u saqlangan va internet
 * qaytganda yuboriladi.
 *
 * Shuning uchun bu o'ram navbatga tushishni MUVAFFAQIYAT deb qaytaradi:
 * modal yopiladi, ro'yxat yangilanadi, yuborilmagani esa tepadagi
 * umumiy qatorda sanalib turadi. Odam xato ko'rsa, amalni qayta
 * kiritar va internet qaytganda ikkita yozuv paydo bo'lardi.
 *
 * FAQAT natijasi ISHLATILMAYDIGAN mutatsiyalar uchun: bu yerda
 * qaytadigan qiymat yo'q (server javobi hali yo'q). Natijaga tayangan
 * joy (masalan yangi yozuvning id'si kerak bo'lsa) buni ishlatmasligi
 * kerak — u yerda oflayn xatti-harakat alohida o'ylanadi.
 */
export const offlineTolerant =
  <TVars, TData>(fn: (vars: TVars) => Promise<TData>) =>
  async (vars: TVars): Promise<TData | undefined> => {
    try {
      return await fn(vars);
    } catch (error) {
      if (isQueuedOffline(error)) return undefined;
      throw error;
    }
  };
