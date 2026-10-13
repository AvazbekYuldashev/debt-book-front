import { toAmount, type RentalPeriod } from '../types/rental';
import type { RentalItemResponseDTO } from '../types/rentalItem';

/**
 * Ombor hisobi: nechtasi BAND (mijozlarda), nechtasi BO'SH.
 *
 * Band soni serverdan keladi (ochiq ijaralardagi qolgan buyumlar
 * yig'indisi) — telefon uni o'zi sanamaydi, chunki ro'yxat sahifalab
 * yuklanadi va hamma ijara qo'lda bo'lmaydi.
 */

/** Hozir mijozlarda turgani. */
export const busyQuantity = (item: RentalItemResponseDTO): number =>
  Math.max(0, toAmount(item.busyQuantity));

/**
 * Berish mumkin bo'lgani. Noldan pastga tushmaydi: jami keyin
 * kamaytirilgan bo'lsa band soni jamidan oshib ketishi mumkin.
 */
export const freeQuantity = (item: RentalItemResponseDTO): number =>
  Math.max(0, toAmount(item.totalQuantity) - busyQuantity(item));

/** Band ulushi 0..1 — ombor qatoridagi chiziq uchun. */
export const busyShare = (item: RentalItemResponseDTO): number => {
  const total = toAmount(item.totalQuantity);
  if (total <= 0) return 0;
  return Math.min(1, busyQuantity(item) / total);
};

/** Hammasi mijozlarda — qatorda alohida belgi bilan ko'rsatiladi. */
export const isFullyBusy = (item: RentalItemResponseDTO): boolean =>
  toAmount(item.totalQuantity) > 0 && freeQuantity(item) === 0;

/**
 * Ombor ro'yxati guruhlarga: kategoriya bo'yicha, kategoriyasizlar oxirida.
 * Ichida nom bo'yicha alifbo tartibida — buyum doim bir joyda tursin.
 */
export const groupRentalItems = (
  items: RentalItemResponseDTO[],
): { category: string | null; items: RentalItemResponseDTO[] }[] => {
  const groups = new Map<string, RentalItemResponseDTO[]>();
  for (const item of items) {
    const key = item.category?.trim() ?? '';
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    })
    .map(([category, list]) => ({
      category: category || null,
      items: [...list].sort((x, y) => x.name.localeCompare(y.name)),
    }));
};

/** Ombordagi mavjud kategoriyalar — forma takliflari uchun. */
export const rentalItemCategories = (items: RentalItemResponseDTO[]): string[] =>
  [...new Set(items.map((item) => item.category?.trim()).filter((v): v is string => Boolean(v)))].sort(
    (a, b) => a.localeCompare(b),
  );

/** Faqat shu davrdagi buyumlar (bir buyurtmada davr bitta). */
export const itemsForPeriod = (
  items: RentalItemResponseDTO[],
  period: RentalPeriod,
): RentalItemResponseDTO[] => items.filter((item) => item.period === period);
