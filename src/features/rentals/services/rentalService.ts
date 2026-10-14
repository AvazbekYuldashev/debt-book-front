import apiClient, { setApiAuthToken } from '../../../shared/api/apiClient';
import { AppResponse, PageResponse } from '../../../shared/types/money';
import { normalizeCurrency } from '../../../shared/lib/currency';
import {
  normalizeRentalPeriod,
  RentalBatchCreateDTO,
  RentalFilterDTO,
  RentalPaymentDTO,
  RentalRequestDTO,
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

/** Soat HH:mm ko'rinishida — server "14:00:00" yuborsa ham. */
const toHourMinute = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.length >= 5 ? value.slice(0, 5) : null;

/**
 * Backend narx va summalarni BigDecimal saqlaydi, Jackson esa ularni ba'zan
 * satr qilib yuboradi ("50000.00"). Hisob-kitob son kutadi, shuning uchun
 * javob chegarasida bir marta normallashtiriladi — ekranlarda emas.
 */
export const normalizeRental = (raw: RentalResponseDTO): RentalResponseDTO => ({
  // Server `null` yuboradi, ilova esa "yo'q" ni null deb biladi; satr
  // ko'rinishida kelsa ham songa aylantiramiz (pul maydonlari kabi).
  pendingPayment: raw.pendingPayment == null ? null : toAmount(raw.pendingPayment),
  ...raw,
  // `price` — yangi nom; eski server faqat `dailyPrice` yuboradi (u
  // paytda hamma ijara kunlik edi).
  price: toAmount(raw.price ?? raw.dailyPrice),
  period: normalizeRentalPeriod(raw.period),
  paidAmount: toAmount(raw.paidAmount),
  // Miqdor yo'q bo'lsa 1: eski yozuvlarda ustun umuman bo'lmagan.
  quantity: raw.quantity === null || raw.quantity === undefined ? 1 : toAmount(raw.quantity) || 1,
  currency: normalizeCurrency(raw.currency),
  // Soat HH:mm bo'lishi shart (hisob shu ko'rinishni kutadi); server
  // "14:00:00" yuborsa soniyasi kesiladi.
  startTime: toHourMinute(raw.startTime),
  dueTime: toHourMinute(raw.dueTime),
  returnedTime: toHourMinute(raw.returnedTime),
  // Qaytarish partiyalari: hisob shular bo'yicha chiqadi, demak miqdor
  // satr bo'lib kelsa ham son bo'lishi shart.
  returns: (raw.returns ?? []).map((item) => ({
    ...item,
    quantity: toAmount(item.quantity),
    returnedTime: toHourMinute(item.returnedTime),
  })),
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

/**
 * Bir mijozga bir nechta buyumni birdaniga berish (bitta buyum ham shu
 * yo'l bilan ketadi). Server hammasini bitta tranzaksiyada yozadi: biror
 * buyum omborda yetmasa hech biri yozilmaydi.
 */
export const createRentalBatch = async (
  dto: RentalBatchCreateDTO,
  token?: string
): Promise<RentalResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.post<RentalResponseDTO[]>('/rental/batch', dto);
  return (response.data ?? []).map(normalizeRental);
};

/**
 * MENDAGI buyumlar: men mijoz bo'lgan ijaralar (shu do'kon bo'yicha).
 *
 * Yozuv do'konning daftarida turadi, lekin mijoz ham o'zidagini
 * ko'rishi kerak — qarz tarixi ham ikki tomonlama.
 */
export const getRentalsWithBusiness = async (
  businessId: string,
  token?: string,
): Promise<RentalResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<RentalResponseDTO[]>(
    `/rental/with-business/${encodeURIComponent(businessId)}`,
  );
  return (response.data ?? []).map(normalizeRental);
};

/** Mijoz yozadigan ijara: tasdiq kutib turadi, ombordan band qilmaydi. */
export const requestRental = async (
  dto: RentalRequestDTO,
  token?: string,
): Promise<RentalResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.post<RentalResponseDTO[]>('/rental/request', dto);
  return (response.data ?? []).map(normalizeRental);
};

/** Egasi tasdiqlaydi — shundan keyin buyum band bo'ladi. */
export const confirmRental = async (id: string, token?: string): Promise<RentalResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.put<RentalResponseDTO>(`/rental/${id}/confirm`, {});
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

/**
 * MIJOZ "pul berdim" deb yozadi — tasdiq kutadi.
 *
 * Egasining yo'li alohida (`payRental`): u o'z daftarida pul olganini
 * yozadi va tasdiq kutishi kerak emas.
 */
export const requestRentalPayment = async (
  id: string,
  dto: RentalPaymentDTO,
  token?: string
): Promise<RentalResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<RentalResponseDTO>(`/rental/${id}/payment-request`, dto);
  return normalizeRental(response.data);
};

/** Egasi mijozning to'lovini tasdiqlaydi — summa hisobga qo'shiladi. */
export const confirmRentalPayment = async (
  id: string,
  token?: string
): Promise<RentalResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<RentalResponseDTO>(`/rental/${id}/payment-confirm`);
  return normalizeRental(response.data);
};

/** Egasi rad etadi — summa hisobga kirmaydi. */
export const rejectRentalPayment = async (
  id: string,
  token?: string
): Promise<RentalResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<RentalResponseDTO>(`/rental/${id}/payment-reject`);
  return normalizeRental(response.data);
};

/** Xato kiritilgan yozuvni olib tashlash. */
export const deleteRental = async (id: string, token?: string): Promise<AppResponse<string>> => {
  setApiAuthToken(token);
  const response = await apiClient.delete<AppResponse<string>>(`/rental/${id}`);
  return response.data;
};
