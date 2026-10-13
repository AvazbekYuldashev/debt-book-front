import apiClient, { setApiAuthToken } from '../../../shared/api/apiClient';
import { AppResponse } from '../../../shared/types/money';
import { normalizeCurrency } from '../../../shared/lib/currency';
import { normalizeRentalPeriod, toAmount } from '../types/rental';
import type {
  RentalItemCreateDTO,
  RentalItemResponseDTO,
  RentalItemUpdateDTO,
} from '../types/rentalItem';

/**
 * Ijara ombori API'si (`docs/rental-api.md`, "Ombor" bo'limi).
 *
 * Ro'yxat SAHIFALANMAYDI: ijarachining buyum TURLARI odatda o'nlab,
 * ko'pi bilan bir necha yuz — ularni bitta so'rovda olib, qidiruv va
 * guruhlashni telefonda qilish sahifalashdan ancha sodda.
 *
 * Biznes hisobida `X-Business-ID` sarlavhasi apiClient'da o'zi qo'shiladi:
 * ombor biznesniki, ya'ni uning hamma a'zolari BIR XIL ro'yxatni ko'radi.
 */

export const normalizeRentalItem = (raw: RentalItemResponseDTO): RentalItemResponseDTO => ({
  ...raw,
  period: normalizeRentalPeriod(raw.period),
  price: toAmount(raw.price),
  currency: normalizeCurrency(raw.currency),
  totalQuantity: toAmount(raw.totalQuantity),
  busyQuantity: toAmount(raw.busyQuantity),
});

export const getRentalItems = async (token?: string): Promise<RentalItemResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<RentalItemResponseDTO[]>('/rental-item/my');
  return (response.data ?? []).map(normalizeRentalItem);
};

/**
 * BOSHQA biznesning ijara ombori — mijoz ko'rinishi.
 *
 * Narxnomadagi `getBusinessProducts` bilan bir xil: biznes id'si yo'ldan
 * boradi, a'zolik talab qilinmaydi (ijarachi buyumlarini mijozga
 * ko'rsatish uchun kiritadi).
 */
export const getBusinessRentalItems = async (
  businessId: string,
  token?: string,
): Promise<RentalItemResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<RentalItemResponseDTO[]>(
    `/rental-item/by-business/${encodeURIComponent(businessId)}`,
  );
  return (response.data ?? []).map(normalizeRentalItem);
};

export const createRentalItem = async (
  dto: RentalItemCreateDTO,
  token?: string
): Promise<RentalItemResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<RentalItemResponseDTO>('/rental-item', dto);
  return normalizeRentalItem(response.data);
};

export const updateRentalItem = async (
  dto: RentalItemUpdateDTO,
  token?: string
): Promise<RentalItemResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.put<RentalItemResponseDTO>('/rental-item', dto);
  return normalizeRentalItem(response.data);
};

/**
 * Ombordan olib tashlash. Buyum hali biror mijozda bo'lsa server rad
 * etadi (409) — aks holda u ijaralar "egasiz" qolardi.
 */
export const deleteRentalItem = async (id: string, token?: string): Promise<AppResponse<string>> => {
  setApiAuthToken(token);
  const response = await apiClient.delete<AppResponse<string>>(`/rental-item/${id}`);
  return response.data;
};
