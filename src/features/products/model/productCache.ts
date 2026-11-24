import { pendingId } from '../../../shared/lib/pendingWrites';
import type { ProductCreateDTO, ProductResponseDTO } from '../types/product';

// ============================================================
//  NARXNOMA — oflayn kesh kaliti va vaqtinchalik yozuv.
//
//  Narx aynan oflaynda kerak bo'ladi: do'kon ichida, savdo paytida,
//  internet eng beqaror joyda. Ilgari bu ekran hech narsa saqlamasdi
//  va tarmoqsiz paytda narxnoma butunlay bo'sh chiqardi.
// ============================================================

/** `accountKey` SHART: narxnoma biznesga tegishli, hisob almashsa boshqasi. */
export const productsKey = (accountKey: string): unknown[] => ['products', accountKey];

/**
 * Oflaynda kiritilgan mahsulot — hali serverga yetmagan.
 *
 * `businessId` bo'sh qoladi: u serverda biriktiriladi va bu yerda
 * taxmin qilish noto'g'ri raqam yozib qo'yishdan yaxshi emas.
 */
export const buildPendingProduct = (
  key: string,
  input: ProductCreateDTO,
  categoryName?: string,
): ProductResponseDTO => ({
  id: pendingId(key),
  businessId: '',
  name: input.name,
  code: input.code ?? null,
  price: input.price,
  currency: input.currency,
  unit: input.unit,
  amount: input.amount ?? null,
  description: input.description ?? null,
  categoryId: input.categoryId ?? null,
  categoryName: categoryName ?? null,
  createdDate: new Date().toISOString(),
  pending: true,
});
