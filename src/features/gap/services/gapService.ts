import apiClient, { setApiAuthToken } from '../../../shared/api/apiClient';
import { PageResponse } from '../../../shared/types/money';
import {
  GapFilterDTO,
  GapGroupCreateDTO,
  GapMemberCreateDTO,
  GapMemberDTO,
  GapMemberDetailDTO,
  GapResponseDTO,
  GapSummaryDTO,
  GapTransferCreateDTO,
  GapUnit,
} from '../types/gap';

export interface GetMyGapsParams {
  filter?: GapFilterDTO;
  page?: number;
  size?: number;
  token?: string;
}

// ---------------------------------------------------------------- o'qish

/** Statistika paneli. Filter bo'sh bo'lsa barcha birliklar qaytadi. */
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

/** Filter chiplari uchun birliklar ro'yxati. */
export const getGapUnits = async (token?: string): Promise<GapUnit[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapUnit[]>('/gap/units');
  return response.data ?? [];
};

/** Bitta guruh — ekran ochiq turganda holat yangilanib borishi uchun. */
export const getGapGroup = async (groupId: string, token?: string): Promise<GapResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapResponseDTO>(`/gap/${groupId}`);
  return response.data;
};

/** Guruh a'zolari. Summalar menga nisbatan: undan olganim, unga berganim. */
export const getGapMembers = async (
  groupId: string,
  token?: string
): Promise<GapMemberDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapMemberDTO[]>(`/gap/${groupId}/members`);
  return response.data ?? [];
};

/** Bitta a'zoning oldi-berdi tarixi. */
export const getGapMemberDetail = async (
  memberId: string,
  token?: string
): Promise<GapMemberDetailDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapMemberDetailDTO>(`/gap/member/${memberId}`);
  return response.data;
};

// ---------------------------------------------------------------- yozish

export const createGap = async (dto: GapGroupCreateDTO, token?: string): Promise<string> => {
  setApiAuthToken(token);
  const response = await apiClient.post<string>('/gap/manage', dto);
  return response.data;
};

export const updateGap = async (
  groupId: string,
  dto: Partial<GapGroupCreateDTO>,
  token?: string
): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.put(`/gap/manage/${groupId}`, dto);
};

export const deleteGap = async (groupId: string, token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.delete(`/gap/manage/${groupId}`);
};

export const addGapMember = async (
  groupId: string,
  dto: GapMemberCreateDTO,
  token?: string
): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.post(`/gap/manage/${groupId}/members`, dto);
};

export const removeGapMember = async (memberId: string, token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.delete(`/gap/manage/members/${memberId}`);
};

/** Yangi oldi-berdi. Yozuvni kiritgan odam uni o'zi tasdiqlamaydi. */
export const createGapTransfer = async (
  groupId: string,
  dto: GapTransferCreateDTO,
  token?: string
): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.post(`/gap/manage/${groupId}/transfers`, dto);
};

/** Qarama-qarshi tomon yozuvni tasdiqlaydi. */
export const confirmGapTransfer = async (transferId: string, token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.put(`/gap/manage/transfers/${transferId}/confirm`, {});
};

/** Xato kiritilgan yozuvni olib tashlash — faqat tasdiqlanmaguncha. */
export const deleteGapTransfer = async (transferId: string, token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.delete(`/gap/manage/transfers/${transferId}`);
};
