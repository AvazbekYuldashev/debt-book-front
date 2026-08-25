// ============================================================
//  Gap kassa API qatlami.
//
//  Loyiha konvensiyasi: har bir funksiya `token` oladi va
//  setApiAuthToken(token) chaqiradi (categoryService bilan bir xil).
//  `page` 1 dan boshlanadi — backend o'zi 0 ga o'giradi.
// ============================================================

import apiClient, { setApiAuthToken } from '../../../shared/api/apiClient';
import { AppResponse, PageResponse } from '../../../shared/types/money';
import {
  GapAuditResponseDTO,
  GapContributionResponseDTO,
  GapDisputeCreateDTO,
  GapDisputeResolveDTO,
  GapDisputeResponseDTO,
  GapGroupCreateDTO,
  GapGroupResponseDTO,
  GapMemberCreateDTO,
  GapMemberResponseDTO,
  GapMyDashboardDTO,
  GapPayoutReleaseDTO,
  GapPayoutResponseDTO,
  GapQueueAssignDTO,
  GapQueueNextDTO,
  GapRoundResponseDTO,
  GapSettlementDTO,
  GapShareBalanceDTO,
  GapShareResponseDTO,
  GapSwapRequestDTO,
  GapSwapResponseDTO,
} from '../types/gap';

// ----------------------------------------------------------- guruh --

export const createGapGroup = async (
  dto: GapGroupCreateDTO,
  token?: string,
): Promise<GapGroupResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapGroupResponseDTO>('/gap/group', dto);
  return response.data;
};

export const getMyGapGroups = async (
  { page = 1, size = 20 }: { page?: number; size?: number },
  token?: string,
): Promise<PageResponse<GapGroupResponseDTO>> => {
  setApiAuthToken(token);
  const response = await apiClient.get<PageResponse<GapGroupResponseDTO>>('/gap/group/my', {
    params: { page, size },
  });
  return response.data;
};

export const getGapGroup = async (groupId: string, token?: string): Promise<GapGroupResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapGroupResponseDTO>(`/gap/group/${groupId}`);
  return response.data;
};

/** TZ 12-bo'lim: a'zoning asosiy ekrani — uchta savolga bitta so'rovda javob. */
export const getMyGapDashboard = async (
  groupId: string,
  token?: string,
): Promise<GapMyDashboardDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapMyDashboardDTO>(`/gap/group/${groupId}/my`);
  return response.data;
};

export const activateGapGroup = async (
  groupId: string,
  token?: string,
): Promise<GapGroupResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapGroupResponseDTO>(`/gap/group/${groupId}/activate`);
  return response.data;
};

export const terminateGapGroup = async (
  groupId: string,
  reason?: string,
  token?: string,
): Promise<GapSettlementDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapSettlementDTO>(`/gap/group/${groupId}/terminate`, null, {
    params: reason ? { reason } : undefined,
  });
  return response.data;
};

export const getGapSettlement = async (
  groupId: string,
  token?: string,
): Promise<GapSettlementDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapSettlementDTO>(`/gap/group/${groupId}/settlement`);
  return response.data;
};

export const getGapBalances = async (
  groupId: string,
  token?: string,
): Promise<GapShareBalanceDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapShareBalanceDTO[]>(`/gap/group/${groupId}/balance`);
  return response.data;
};

// ------------------------------------------------------------ a'zo --

export const getGapMembers = async (
  groupId: string,
  token?: string,
): Promise<GapMemberResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapMemberResponseDTO[]>(`/gap/group/${groupId}/member`);
  return response.data;
};

export const addGapMember = async (
  groupId: string,
  dto: GapMemberCreateDTO,
  token?: string,
): Promise<GapMemberResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapMemberResponseDTO>(`/gap/group/${groupId}/member`, dto);
  return response.data;
};

export const removeGapMember = async (
  groupId: string,
  memberId: string,
  token?: string,
): Promise<AppResponse<string>> => {
  setApiAuthToken(token);
  const response = await apiClient.delete<AppResponse<string>>(
    `/gap/group/${groupId}/member/${memberId}`,
  );
  return response.data;
};

export const assignGapGuarantor = async (
  groupId: string,
  memberId: string,
  guarantorMemberId: string,
  token?: string,
): Promise<GapMemberResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.patch<GapMemberResponseDTO>(
    `/gap/group/${groupId}/member/${memberId}/guarantor`,
    null,
    { params: { guarantorMemberId } },
  );
  return response.data;
};

/** Sikl o'rtasida o'rinni boshqa odam egallaydi. Qarzdor a'zo almashtirilmaydi. */
export const replaceGapMember = async (
  groupId: string,
  memberId: string,
  dto: GapMemberCreateDTO,
  token?: string,
): Promise<GapMemberResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapMemberResponseDTO>(
    `/gap/group/${groupId}/member/${memberId}/replace`,
    dto,
  );
  return response.data;
};

// ---------------------------------------------------------- navbat --

export const getGapQueue = async (
  groupId: string,
  token?: string,
): Promise<GapShareResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapShareResponseDTO[]>(`/gap/group/${groupId}/queue`);
  return response.data;
};

export const assignGapQueue = async (
  groupId: string,
  dto: GapQueueAssignDTO,
  token?: string,
): Promise<GapShareResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapShareResponseDTO[]>(`/gap/group/${groupId}/queue`, dto);
  return response.data;
};

/**
 * Keyingi davr oluvchisini belgilash — qur'a yoki kelishuv bilan.
 *
 * Faqat tashkilotchi va faqat ochiq davr yo'q paytda ishlaydi.
 */
export const chooseGapNextRecipient = async (
  groupId: string,
  dto: GapQueueNextDTO,
  token?: string,
): Promise<GapShareResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapShareResponseDTO[]>(
    `/gap/queue/${groupId}/next`,
    dto,
  );
  return response.data;
};

/** Almashinuv faqat ikkinchi tomon tasdiqlagach kuchga kiradi. */
export const requestGapSwap = async (
  groupId: string,
  dto: GapSwapRequestDTO,
  token?: string,
): Promise<AppResponse<string>> => {
  setApiAuthToken(token);
  const response = await apiClient.post<AppResponse<string>>(`/gap/queue/${groupId}/swap`, dto);
  return response.data;
};

/** Ochiq almashinuv so'rovlari — butun guruhga ko'rinadi. */
export const getGapPendingSwaps = async (
  groupId: string,
  token?: string,
): Promise<GapSwapResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapSwapResponseDTO[]>(`/gap/queue/${groupId}/swap`);
  return response.data;
};

export const respondGapSwap = async (
  swapId: string,
  accept: boolean,
  token?: string,
): Promise<GapShareResponseDTO[]> => {
  setApiAuthToken(token);
  const action = accept ? 'accept' : 'reject';
  const response = await apiClient.post<GapShareResponseDTO[]>(`/gap/queue/swap/${swapId}/${action}`);
  return response.data;
};

// ------------------------------------------------------------ davr --

export const getGapRounds = async (
  groupId: string,
  token?: string,
): Promise<GapRoundResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapRoundResponseDTO[]>(`/gap/round/group/${groupId}`);
  return response.data;
};

// Eslatma: `/gap/round/group/{id}/current` endpointi backendda bor, lekin bu
// yerda o'ralmagan — joriy davr `/gap/group/{id}/my` javobida allaqachon keladi
// va uni ikkinchi marta so'rash ortiqcha.

export const openGapRound = async (
  roundId: string,
  token?: string,
): Promise<GapRoundResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapRoundResponseDTO>(`/gap/round/${roundId}/open`);
  return response.data;
};

export const closeGapRound = async (
  roundId: string,
  token?: string,
): Promise<GapRoundResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapRoundResponseDTO>(`/gap/round/${roundId}/close`);
  return response.data;
};

export const getGapRoundContributions = async (
  roundId: string,
  token?: string,
): Promise<GapContributionResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapContributionResponseDTO[]>(
    `/gap/round/${roundId}/contribution`,
  );
  return response.data;
};

export const getGapRoundPayouts = async (
  roundId: string,
  token?: string,
): Promise<GapPayoutResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapPayoutResponseDTO[]>(`/gap/round/${roundId}/payout`);
  return response.data;
};

// ------------------------------------------------- badal va kassa --
// DIQQAT: bu chaqiruvlar hech qanday pul o'tkazmaydi — faqat faktni qayd etadi.

/**
 * Bitta ulushning barcha badallari — "men kimga qancha to'ladim".
 *
 * Davr bo'yicha yig'ish mumkin edi, lekin 20 davrli guruhda bu 20 ta so'rov
 * degani bo'lardi — shuning uchun backendda alohida endpoint.
 */
export const getGapShareContributions = async (
  shareId: string,
  token?: string,
): Promise<GapContributionResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapContributionResponseDTO[]>(
    `/gap/contribution/share/${shareId}`,
  );
  return response.data;
};

/**
 * A'zo "to'ladim" deydi va to'lagan summasini kiritadi.
 *
 * `amount` berilmasa to'liq badal hisoblanadi. Badaldan oshiq summa backendda
 * rad etiladi — ortiqcha pul boshqa a'zoning hissasini yopib qo'yardi.
 */
export const declareGapContribution = async (
  contributionId: string,
  amount?: number,
  token?: string,
): Promise<GapContributionResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapContributionResponseDTO>(
    `/gap/contribution/${contributionId}/declare`,
    amount != null ? { amount } : {},
  );
  return response.data;
};

/** Tashkilotchi yoki shu oy kassani oluvchi "oldim" deb tasdiqlaydi. */
export const confirmGapContribution = async (
  contributionId: string,
  token?: string,
): Promise<GapContributionResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapContributionResponseDTO>(
    `/gap/contribution/${contributionId}/confirm`,
  );
  return response.data;
};

export const releaseGapPayout = async (
  roundId: string,
  dto: GapPayoutReleaseDTO | undefined,
  token?: string,
): Promise<GapPayoutResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapPayoutResponseDTO>(
    `/gap/payout/round/${roundId}/release`,
    dto ?? {},
  );
  return response.data;
};

export const confirmGapPayout = async (
  payoutId: string,
  token?: string,
): Promise<GapPayoutResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapPayoutResponseDTO>(`/gap/payout/${payoutId}/confirm`);
  return response.data;
};

// ------------------------------------------------------ nizo, tarix --

export const openGapDispute = async (
  groupId: string,
  dto: GapDisputeCreateDTO,
  token?: string,
): Promise<GapDisputeResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapDisputeResponseDTO>(`/gap/dispute/group/${groupId}`, dto);
  return response.data;
};

export const resolveGapDispute = async (
  disputeId: string,
  dto: GapDisputeResolveDTO,
  token?: string,
): Promise<GapDisputeResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<GapDisputeResponseDTO>(
    `/gap/dispute/${disputeId}/resolve`,
    dto,
  );
  return response.data;
};

export const getGapDisputes = async (
  groupId: string,
  token?: string,
): Promise<GapDisputeResponseDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<GapDisputeResponseDTO[]>(`/gap/dispute/group/${groupId}`);
  return response.data;
};

/** Tarix matni backend tomonidan Accept-Language bo'yicha render qilinadi. */
export const getGapHistory = async (
  groupId: string,
  { page = 1, size = 30 }: { page?: number; size?: number },
  token?: string,
): Promise<PageResponse<GapAuditResponseDTO>> => {
  setApiAuthToken(token);
  const response = await apiClient.get<PageResponse<GapAuditResponseDTO>>(
    `/gap/history/group/${groupId}`,
    { params: { page, size } },
  );
  return response.data;
};
