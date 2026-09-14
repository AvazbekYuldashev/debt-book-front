import apiClient, { setApiAuthToken } from '../../../shared/api/apiClient';
import { AppResponse, PageResponse } from '../../../shared/types/money';
import { normalizeCurrency } from '../../../shared/lib/currency';
import {
  ProductCreateDTO,
  ProductPriceUpdateDTO,
  ProductPublicDTO,
  ProductResponseDTO,
  ProductUpdateDTO,
  normalizeProductUnit,
} from '../types/product';

export interface GetProductsParams {
  page?: number;
  size?: number;
  /** Nom, artikul yoki izoh bo'yicha qidiruv (bo'sh bo'lsa yuborilmaydi). */
  search?: string;
  token?: string;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

/**
 * Backend narxni BigDecimal sifatida saqlaydi va Jackson uni ba'zan satr
 * qilib yuboradi ("3500.00"). UI'da hisob-kitob va formatlash son kutadi,
 * shuning uchun javob chegarasida bir marta normallashtiriladi.
 */
const normalizeProduct = <T extends ProductPublicDTO>(raw: T): T => ({
  ...raw,
  price: toNumber(raw.price),
  currency: normalizeCurrency(raw.currency),
  unit: normalizeProductUnit(raw.unit),
});

export const getProducts = async ({
  page = 1,
  size = 50,
  search,
  token,
}: GetProductsParams): Promise<PageResponse<ProductResponseDTO>> => {
  setApiAuthToken(token);
  const trimmed = search?.trim();
  const response = await apiClient.get<PageResponse<ProductResponseDTO>>('/product', {
    params: { page, size, ...(trimmed ? { search: trimmed } : {}) },
  });
  const data = response.data;
  return { ...data, content: (data?.content ?? []).map(normalizeProduct) };
};

/**
 * BOSHQA biznesning ochiq narxnomasi - mijoz do'kon narxini ko'rishi uchun.
 *
 * `getProducts` dan farqi: biznes id'si yo'ldan boradi, X-Business-ID sarlavhasi
 * esa KO'RUVCHINING o'z ish maydonini bildiradi. Ikkisi almashtirilsa server
 * 403 qaytaradi (a'zo bo'lmagan biznes konteksti).
 */
export const getBusinessProducts = async ({
  businessId,
  page = 1,
  size = 100,
  search,
  token,
}: GetProductsParams & { businessId: string }): Promise<PageResponse<ProductPublicDTO>> => {
  setApiAuthToken(token);
  const trimmed = search?.trim();
  const response = await apiClient.get<PageResponse<ProductPublicDTO>>(
    `/product/by-business/${encodeURIComponent(businessId)}`,
    { params: { page, size, ...(trimmed ? { search: trimmed } : {}) } }
  );
  const data = response.data;
  return { ...data, content: (data?.content ?? []).map(normalizeProduct) };
};

export const getProductById = async (id: string, token?: string): Promise<ProductResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<ProductResponseDTO>(`/product/${id}`);
  return normalizeProduct(response.data);
};

export const createProduct = async (dto: ProductCreateDTO, token?: string): Promise<ProductResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<ProductResponseDTO>('/product', dto);
  return normalizeProduct(response.data);
};

export const updateProduct = async (dto: ProductUpdateDTO, token?: string): Promise<ProductResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.put<ProductResponseDTO>('/product', dto);
  return normalizeProduct(response.data);
};

export const updateProductPrice = async (
  dto: ProductPriceUpdateDTO,
  token?: string
): Promise<AppResponse<string>> => {
  setApiAuthToken(token);
  const response = await apiClient.patch<AppResponse<string>>('/product/price', dto);
  return response.data;
};

export const deleteProduct = async (id: string, token?: string): Promise<AppResponse<string>> => {
  setApiAuthToken(token);
  const response = await apiClient.delete<AppResponse<string>>(`/product/${id}`);
  return response.data;
};
