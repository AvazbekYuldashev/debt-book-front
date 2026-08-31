import apiClient, { setApiAuthToken } from '../../../shared/api/apiClient';
import { PageResponse } from '../../../shared/types/money';
import {
  GapFilterDTO,
  GapMemberDTO,
  GapResponseDTO,
  GapShareDetailDTO,
  GapSummaryDTO,
  GapUnit,
} from '../types/gap';

export interface GetMyGapsParams {
  filter?: GapFilterDTO;
  page?: number;
  size?: number;
  token?: string;
}

/** Statistika paneli. Filter bo'sh bo'lsa barcha valyutalar qaytadi. */
export const getGapSummary = async (
  filter: GapFilterDTO = {},
  token?: string
): Promise<GapSummaryDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapSummaryDTO>('/gap/summary', filter);
  return response.data;
};

/** Men qatnashayotgan gap kassalar. Filter bo'sh bo'lsa hammasi. */
export const getMyGaps = async ({
  filter = {},
  page = 1,
  size = 15,
  token,
}: GetMyGapsParams): Promise<PageResponse<GapResponseDTO>> => {
  setApiAuthToken(token);
  const response = await apiClient.post<PageResponse<GapResponseDTO>>('/gap/my', filter, {
    params: { page, size },
  });
  return response.data;
};

/** Guruh a'zolari, navbat tartibida. */
export const getGapMembers = async (
  groupId: string,
  token?: string
): Promise<GapMemberDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapMemberDTO[]>(`/gap/${groupId}/members`);
  return response.data;
};

/** Bitta a'zoning hisob-kitobi: unga kim bergan, u kimga bergan. */
export const getGapShareDetail = async (
  shareId: string,
  token?: string
): Promise<GapShareDetailDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapShareDetailDTO>(`/gap/member/${shareId}`);
  return response.data;
};

/** Filter chiplari uchun: men qatnashayotgan guruhlardagi birliklar. */
export const getGapUnits = async (token?: string): Promise<GapUnit[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapUnit[]>('/gap/units');
  return response.data;
};

export interface GapMemberInput {
  name: string;
  phone?: string;
  profileId?: string;
  shareCount?: number;
}

export interface GapCreateInput {
  name: string;
  amount: number;
  unitType: 'MONEY' | 'GOODS';
  unitCode: string;
  unitLabel: string;
  paymentDay: number;
  queueMode: 'UPFRONT' | 'MONTHLY';
  queueType: 'AGREEMENT' | 'LOTTERY';
  members: GapMemberInput[];
}

/** Yangi gap kassa. Guruh DRAFT holatida yaratiladi, ID qaytadi. */
export const createGap = async (dto: GapCreateInput, token?: string): Promise<string> => {
  setApiAuthToken(token);
  const response = await apiClient.post<{ data: string }>('/gap', dto);
  return response.data.data;
};

/** Siklni boshlash: davrlar generatsiya qilinadi, guruh ACTIVE bo'ladi. */
export const startGap = async (groupId: string, token?: string): Promise<string> => {
  setApiAuthToken(token);
  const response = await apiClient.post<{ data: string }>(`/gap/${groupId}/start`);
  return response.data.data;
};

/** Guruhga a'zo qo'shish (guruh DRAFT holatida). */
export const addGapMember = async (
  groupId: string,
  dto: GapMemberInput,
  token?: string
): Promise<string> => {
  setApiAuthToken(token);
  const response = await apiClient.post<{ data: string }>(`/gap/${groupId}/members`, dto);
  return response.data.data;
};

/** Bitta davrning oluvchisini belgilash. shareId berilmasa qur'a tashlanadi. */
export const setPeriodReceiver = async (
  groupId: string,
  periodNumber: number,
  shareId: string | null,
  token?: string
): Promise<string> => {
  setApiAuthToken(token);
  const response = await apiClient.post<{ data: string }>(`/gap/${groupId}/period-receiver`, {
    periodNumber,
    shareId,
  });
  return response.data.data;
};

/**
 * Belgilangan davrning navbatini bekor qilib qaytadan tashlash.
 * `periodNumber` berilmasa eng oxirgi belgilangan davr olinadi.
 */
export const redrawPeriod = async (
  groupId: string,
  periodNumber: number | null,
  token?: string
): Promise<string> => {
  setApiAuthToken(token);
  const response = await apiClient.post<{ data: string }>(`/gap/${groupId}/redraw`, null, {
    params: periodNumber == null ? {} : { periodNumber },
  });
  return response.data.data;
};

/** "Berdim" — to'lovchi o'z ulushini berganini belgilaydi. */
export const markGapPaid = async (
  paymentId: string,
  amount: number | null,
  token?: string
): Promise<string> => {
  setApiAuthToken(token);
  const response = await apiClient.post<{ data: string }>(
    `/gap/payment/${paymentId}/paid`,
    amount == null ? {} : { amount }
  );
  return response.data.data;
};

/** "Oldim" — qabul qiluvchi to'lovni tasdiqlaydi. */
export const confirmGapPaid = async (paymentId: string, token?: string): Promise<string> => {
  setApiAuthToken(token);
  const response = await apiClient.post<{ data: string }>(`/gap/payment/${paymentId}/confirm`);
  return response.data.data;
};

/** Joriy davrni yopib, siklni keyingi oyga o'tkazish. */
export const closeGapPeriod = async (groupId: string, token?: string): Promise<string> => {
  setApiAuthToken(token);
  const response = await apiClient.post<{ data: string }>(`/gap/${groupId}/close-period`);
  return response.data.data;
};

/** Bitta guruhning joriy holati (davr raqami, status, tashkilotchimi ...). */
export const getGapGroup = async (groupId: string, token?: string): Promise<GapResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapResponseDTO>(`/gap/${groupId}`);
  return response.data;
};
