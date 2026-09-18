import { Currency } from '../../../shared/types/money';

/**
 * Mahsulot o'lchov birligi — narx AYNAN shu birlik uchun.
 * Backend'dagi `ProductUnit` enum'i bilan bir xil bo'lishi shart.
 */
export const PRODUCT_UNITS = ['DONA', 'KG', 'GRAM', 'LITR', 'METR', 'QUTI', 'SOAT', 'XIZMAT'] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const DEFAULT_PRODUCT_UNIT: ProductUnit = 'DONA';

export const isProductUnit = (value: unknown): value is ProductUnit =>
  typeof value === 'string' && (PRODUCT_UNITS as readonly string[]).includes(value);

export const normalizeProductUnit = (value: unknown): ProductUnit =>
  isProductUnit(value) ? value : DEFAULT_PRODUCT_UNIT;

export interface ProductResponseDTO {
  id: string;
  businessId: string;
  name: string;
  /** Artikul / shtrix-kod — ixtiyoriy, biznes ichida yagona. */
  code?: string | null;
  price: number;
  currency?: Currency;
  unit?: ProductUnit;
  description?: string | null;
  /** Narxnoma kategoriyasi — ixtiyoriy, kategoriyasiz mahsulot ham bo'ladi. */
  categoryId?: string | null;
  /** Server bilan keladi, alohida so'rov shart emas. */
  categoryName?: string | null;
  createdDate?: string;
  updatedDate?: string;
  creatorId?: string;
}

/**
 * Begona biznesning narxnomasidagi qator.
 *
 * Server ataylab kam maydon qaytaradi: mijozga narx kerak, do'konning ichki
 * hisobi (kim kiritgan, qachon) emas.
 */
export interface ProductPublicDTO {
  id: string;
  businessId: string;
  name: string;
  code?: string | null;
  price: number;
  currency?: Currency;
  unit?: ProductUnit;
  description?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface ProductCreateDTO {
  name: string;
  code?: string;
  price: number;
  currency: Currency;
  unit: ProductUnit;
  description?: string;
  /** Bo'sh yuborilsa kategoriyasiz saqlanadi. */
  categoryId?: string;
}

export interface ProductUpdateDTO extends ProductCreateDTO {
  id: string;
}

/** Faqat narxni almashtirish — butun kartochkani qayta yubormaslik uchun. */
export interface ProductPriceUpdateDTO {
  id: string;
  price: number;
  currency?: Currency;
}
