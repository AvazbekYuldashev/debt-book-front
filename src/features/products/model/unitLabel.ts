import { formatQuantity } from '../../../shared/lib/quantity';

/**
 * Mahsulot o'lchamini o'qiladigan ko'rinishga keltiradi: "1 litr", "0.5 litr".
 *
 * Miqdor HAR DOIM yoziladi, 1 bo'lganda ham. Avval u yashirilardi
 * ("7 000 so'm / litr"), lekin narxnomaga qaragan odam "qancha pulga qancha"
 * degan savolga darhol javob olishi kerak: "7 000 so'm / 1 litr" buni
 * aytadi, "/ litr" esa o'ylab ko'rishni talab qiladi.
 *
 * Sof funksiya: React'siz sinaladi.
 */

/** Miqdorni ishonchli songa keltiradi: yo'q, buzuq yoki musbat emas — 1. */
export function normalizeAmount(amount?: number | string | null): number {
  if (amount === null || amount === undefined || amount === '') return 1;
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(',', '.'));
  return Number.isFinite(num) && num > 0 ? num : 1;
}

/**
 * "1 litr" yoki "0.5 litr".
 *
 * @param amount    mahsulot o'lchami (yo'q bo'lsa 1)
 * @param unitLabel tarjima qilingan birlik nomi ("litr", "porsiya")
 */
export function formatUnitLabel(amount: number | string | null | undefined, unitLabel: string): string {
  return `${formatQuantity(normalizeAmount(amount))} ${unitLabel}`;
}
