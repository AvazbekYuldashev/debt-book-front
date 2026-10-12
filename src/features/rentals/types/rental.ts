import { Currency } from '../../../shared/types/money';
import type { ProductUnit } from '../../products/types/product';

/**
 * Ijara: buyum beriladi, kelishilgan kun o'tadi, puli olinadi.
 *
 * Qarzdan farqi — summa VAQT bilan o'sadi. Shuning uchun yozuvda summa
 * emas, KUNLIK NARX saqlanadi: hisob har ko'rishda qaytadan chiqariladi
 * (`model/rentalMath.ts`). Server ham AYNAN shu qoida bo'yicha hisoblaydi,
 * aks holda telefondagi raqam bilan serverdagi raqam farq qilardi.
 *
 * Pul buyum qaytganda olinadi, ya'ni ijara yopilmaguncha mijozda QARZ
 * bo'lib turadi. Buyumning qaytishi va pulning kelishi ALOHIDA voqea:
 * buyum qaytib, puli keyin ham to'lanishi mumkin.
 */

/**
 * ACTIVE   — buyum mijozda, muddat hali o'tmagan.
 * OVERDUE  — buyum mijozda, muddat o'tib ketgan (hisob o'sib boradi).
 * RETURNED — buyum qaytdi, hisob to'xtadi (puli qolgan bo'lishi mumkin).
 *
 * Holat ALOHIDA ustun sifatida SAQLANMAYDI — u sanalardan kelib chiqadi
 * (`rentalStatus`). Saqlanganda "bugun" o'zgarishi bilan yozuv yolg'on
 * holatda qolib ketardi: kecha ACTIVE yozilgani bugun ham ACTIVE turardi.
 */
export type RentalStatus = 'ACTIVE' | 'OVERDUE' | 'RETURNED';

/** Ro'yxat filtri. Bo'sh yuborilsa hammasi qaytadi. */
export interface RentalFilterDTO {
  clientId?: string;
  status?: RentalStatus;
  /** Buyum nomi yoki mijoz ismi bo'yicha qidiruv. */
  search?: string;
}

export interface RentalResponseDTO {
  id: string;
  /** Mijoz — qarz daftaridagi kontakt (`ClientDTO.id`). */
  clientId: string;
  clientName: string;
  clientPhone?: string | null;
  /** Narxnomadan tanlangan bo'lsa — mahsulot id'si; erkin kiritilsa null. */
  productId?: string | null;
  /** Buyum nomi NUSXA qilib saqlanadi: narxnoma keyin o'zgarsa ham yozuv o'z nomini saqlaydi. */
  itemName: string;
  /** Nechta buyum berildi (10 stol, 50 stul). Berilmasa 1. */
  quantity: number;
  unit?: ProductUnit | null;
  /** BITTA buyumning BIR KUNLIK narxi. Umumiy summa shundan hisoblanadi. */
  dailyPrice: number;
  currency?: Currency;
  /** Buyum berilgan kun — YYYY-MM-DD. */
  startDate: string;
  /** Qaytarilishi kerak bo'lgan kun — YYYY-MM-DD. */
  dueDate: string;
  /** Qaytarilgan kun. null = buyum hali mijozda, hisob o'sib boradi. */
  returnedDate?: string | null;
  /** Shu ijara uchun jami olingan pul. */
  paidAmount: number;
  note?: string | null;
  createdDate?: string;
}

export interface RentalCreateDTO {
  clientId: string;
  itemName: string;
  /** Narxnomadan tanlanganda yuboriladi — hisobot uchun bog'lanish qoladi. */
  productId?: string;
  quantity?: number;
  unit?: ProductUnit;
  dailyPrice: number;
  currency: Currency;
  startDate: string;
  /**
   * Kun soni. `dueDate`ni SERVER hisoblaydi (startDate + days) — ikkisini
   * ham yuborib bir-biriga mos kelmaydigan juftlik qoldirmaslik uchun.
   */
  days: number;
  note?: string;
}

export interface RentalUpdateDTO extends Partial<RentalCreateDTO> {
  id: string;
}

/** Buyum qaytdi. Sana berilmasa server bugunni oladi. */
export interface RentalReturnDTO {
  returnedDate?: string;
}

/** Pul olindi — buyum qaytishidan MUSTAQIL yoziladi. */
export interface RentalPaymentDTO {
  amount: number;
  date?: string;
}

/**
 * Yuqoridagi panel. Valyutalar QO'SHILMAYDI: har biri alohida qator
 * (gap kassadagi kabi — so'm bilan dollarni jamlab bo'lmaydi).
 */
export interface RentalSummaryDTO {
  /** Buyumi mijozda turgan ijaralar soni. */
  activeCount: number;
  /** Muddati o'tganlar soni — ekranda qizil raqam. */
  overdueCount: number;
  /** Shu paytgacha yig'ilgan ijara haqi, valyuta bo'yicha. */
  accruedByCurrency?: Record<string, number | string>;
  /** Hali olinmagan pul (yig'ilgan − to'langan), valyuta bo'yicha. */
  unpaidByCurrency?: Record<string, number | string>;
}

/** Backend BigDecimal'ni ba'zan satr qilib yuboradi — chegarada normallashtiramiz. */
export const toAmount = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};
