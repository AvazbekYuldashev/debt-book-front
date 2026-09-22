import { formatQuantity } from '../../../shared/lib/quantity';

/**
 * Mahsulot o'lchamini o'qiladigan ko'rinishga keltiradi.
 *
 * Qoida bitta: miqdor 1 bo'lsa u YOZILMAYDI. "12 000 so'm / 1 kg" emas,
 * "12 000 so'm / kg" — o'zbekchada ham, ruschada ham odam shunday gapiradi.
 * Bu ayni paytda eski narxnomalarni ham joyida qoldiradi: o'lcham ustuni
 * keyin qo'shilgan, mavjud mahsulotlarning hammasi 1 ga teng.
 *
 * Sof funksiya: React'siz sinaladi.
 */

/** Miqdor amalda 1 ga tengmi (null/undefined ham 1 deb qaraladi). */
export function isSingleUnit(amount?: number | string | null): boolean {
  if (amount === null || amount === undefined || amount === '') return true;
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(',', '.'));
  if (!Number.isFinite(num) || num <= 0) return true;
  return Math.abs(num - 1) < 1e-9;
}

/**
 * "kg" yoki "0.5 litr".
 *
 * @param amount    mahsulot o'lchami (yo'q bo'lsa 1)
 * @param unitLabel tarjima qilingan birlik nomi ("litr", "porsiya")
 */
export function formatUnitLabel(amount: number | string | null | undefined, unitLabel: string): string {
  if (isSingleUnit(amount)) return unitLabel;
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(',', '.'));
  return `${formatQuantity(num)} ${unitLabel}`;
}
