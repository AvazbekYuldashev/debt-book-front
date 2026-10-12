import apiClient, { setApiAuthToken } from '../../../shared/api/apiClient';
import { AppResponse, PageResponse } from '../../../shared/types/money';
import { normalizeCurrency } from '../../../shared/lib/currency';
import {
  RentalCreateDTO,
  RentalFilterDTO,
  RentalPaymentDTO,
  RentalResponseDTO,
  RentalReturnDTO,
  RentalSummaryDTO,
  RentalUpdateDTO,
  toAmount,
} from '../types/rental';

/**
 * Ijara API'si. Yo'llar `docs/rental-api.md` da shartnoma sifatida yozilgan —
 * backend shu shaklni bajaradi.
 *
 * Ro'yxat va panel POST bilan ketadi (filtr tanasi bilan): gap kassa
 * (`/gap/my`, `/gap/summary`) shu uslubda ishlaydi, ijara ham o'sha
 * qolipdan chiqmasligi kerak.
 */

export interface GetRentalsParams {
  filter?: RentalFilterDTO;
  page?: number;
  size?: number;
  token?: string;
}

/**
 * Backend narx va summalarni BigDecimal saqlaydi, Jackson esa ularni ba'zan
 * satr qilib yuboradi ("50000.00"). Hisob-kitob son kutadi, shuning uchun
 * javob chegarasida bir marta normallashtiriladi — ekranlarda emas.
 */
const normalizeRental = (raw: RentalResponseDTO): RentalResponseDTO => ({
  ...raw,
  dailyPrice: toAmount(raw.dailyPrice),
  paidAmount: toAmount(raw.paidAmount),
  // Miqdor yo'q bo'lsa 1: eski yozuvlarda ustun umuman bo'lmagan.
  quantity: raw.quantity === null || raw.quantity === undefined ? 1 : toAmount(raw.quantity) || 1,
  currency: normalizeCurrency(raw.currency),
});

// ---------------------------------------------------------------- o'qish

/** Ijaralar ro'yxati. Filtr bo'sh bo'lsa hammasi qaytadi. */
export const getMyRentals = async ({
  filter = {},
  page = 1,
  size = 20,
  token,
}: GetRentalsParams): Promise<PageResponse<RentalResponseDTO>> => {
  setApiAuthToken(token);
  const response = await apiClient.post<PageResponse<RentalResponseDTO>>('/rental/my', filter, {
    params: { page, size },
  });
  const data = response.data;
  return { ...data, content: (data?.content ?? []).map(normalizeRental) };
};

/** Yuqoridagi panel: nechta ijara ketgan, qanchasi kechikkan, qancha pul yig'ilgan. */
export const getRentalSummary = async (
  filter: RentalFilterDTO = {},
  token?: string
): Promise<RentalSummaryDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<RentalSummaryDTO>('/rental/summary', filter);
  return response.data;
};

export const getRentalById = async (id: string, token?: string): Promise<RentalResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<RentalResponseDTO>(`/rental/${id}`);
  return normalizeRental(response.data);
};

// ---------------------------------------------------------------- yozish

export const createRental = async (
  dto: RentalCreateDTO,
  token?: string
): Promise<RentalResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<RentalResponseDTO>('/rental', dto);
  return normalizeRental(response.data);
};

export const updateRental = async (
  dto: RentalUpdateDTO,
  token?: string
): Promise<RentalResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.put<RentalResponseDTO>('/rental', dto);
  return normalizeRental(response.data);
};

/**
 * Buyum qaytdi — hisob shu kunda to'xtaydi.
 *
 * To'lovdan ALOHIDA: buyum qaytib, puli keyin ham berilishi mumkin, va
 * aksincha — oldindan to'lab, buyum keyin qaytarilishi mumkin.
 */
export const returnRental = async (
  id: string,
  dto: RentalReturnDTO = {},
  token?: string
): Promise<RentalResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<RentalResponseDTO>(`/rental/${id}/return`, dto);
  return normalizeRental(response.data);
};

/** Pul olindi (to'liq yoki qisman). */
export const payRental = async (
  id: string,
  dto: RentalPaymentDTO,
  token?: string
): Promise<RentalResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<RentalResponseDTO>(`/rental/${id}/payment`, dto);
  return normalizeRental(response.data);
};

/** Xato kiritilgan yozuvni olib tashlash. */
export const deleteRental = async (id: string, token?: string): Promise<AppResponse<string>> => {
  setApiAuthToken(token);
  const response = await apiClient.delete<AppResponse<string>>(`/rental/${id}`);
  return response.data;
};
