import type { QueryClient } from '@tanstack/react-query';
import { pendingId } from '../../../shared/lib/pendingWrites';
import type { CategoryResponseDTO, CategoryType } from '../types/category';
import type { ExpenseResponseDTO } from '../types/expense';

// ============================================================
//  XARAJATLAR — oflayn kesh kalitlari va vaqtinchalik yozuvlar.
//
//  Bu ekranlar React Query ni ishlatmaydi: bir ekranda kategoriya
//  ro'yxati va har biriga alohida summa so'rovi qo'lda birlashtiriladi.
//  Natijada ular hech narsa saqlamasdi — oflaynda xarajatlar bo'limi
//  butunlay bo'sh chiqar, ustiga "yuklab bo'lmadi" degan qizil xabar
//  qo'yilardi. Shuning uchun natija keshga QO'LDA yoziladi; kesh esa
//  diskka tushadi.
//
//  Kalitlarda `accountKey` SHART: shaxsiy va biznes hisobning
//  kategoriyalari boshqa-boshqa va aralashsa odam o'zganing
//  xarajatini ko'rib qolardi.
// ============================================================

/** Kategoriya ro'yxati. `type` — xarajat, narxnoma yoki ombor. */
export const categoriesKey = (accountKey: string, type: CategoryType): unknown[] => [
  'categories',
  accountKey,
  type,
];

/** Kategoriyalar bo'yicha summalar — sana oralig'i kalitning qismi. */
export const categorySumsKey = (
  accountKey: string,
  fromDate?: string,
  endDate?: string,
): unknown[] => ['expense-category-sums', accountKey, fromDate ?? '', endDate ?? ''];

/** Bitta kategoriyaning xarajatlari. */
export const expenseListKey = (
  accountKey: string,
  categoryId: string,
  fromDate?: string,
  endDate?: string,
): unknown[] => ['expense-list', accountKey, categoryId, fromDate ?? '', endDate ?? ''];

/** Oflaynda kiritilgan kategoriya — hali serverga yetmagan. */
export const buildPendingCategory = (
  key: string,
  name: string,
  type: CategoryType,
): CategoryResponseDTO => ({
  id: pendingId(key),
  name,
  type,
  visible: true,
  createdDate: new Date().toISOString(),
  pending: true,
});

/** Oflaynda kiritilgan xarajat — hali serverga yetmagan. */
export const buildPendingExpense = (
  key: string,
  input: { amount: number; categoryId: string; description?: string; calcNote?: string },
): ExpenseResponseDTO => ({
  id: pendingId(key),
  amount: input.amount,
  categoryId: input.categoryId,
  description: input.description ?? '',
  calcNote: input.calcNote ?? null,
  createdDate: new Date().toISOString(),
  pending: true,
});
