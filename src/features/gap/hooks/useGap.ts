import { useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../auth/context/AuthContext';
import {
  addGapMember,
  confirmGapTransfer,
  createGap,
  createGapTransfer,
  deleteGap,
  deleteGapTransfer,
  getGapGroup,
  getGapMemberDetail,
  getGapMembers,
  getGapSummary,
  getGapUnits,
  getMyGaps,
  removeGapMember,
  updateGap,
} from '../services/gapService';
import type {
  GapFilterDTO,
  GapGroupCreateDTO,
  GapMemberCreateDTO,
  GapTransferCreateDTO,
  GapUnitFilter,
} from '../types/gap';

const GAP_KEY = 'gap';

/** 'ALL' bo'lsa filtersiz so'rov ketadi — backend hamma birlikni qaytaradi. */
const toFilter = (unitCode: GapUnitFilter): GapFilterDTO =>
  unitCode === 'ALL' ? {} : { unitCode };

/**
 * Statistika paneli. Odatiy holatda ('ALL') har birlik alohida qaytadi —
 * so'm bilan dollarni qo'shib bo'lmaydi, shuning uchun ular jamlanmaydi.
 */
export const useGapSummary = (unitCode: GapUnitFilter) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [GAP_KEY, 'summary', unitCode],
    queryFn: () => getGapSummary(toFilter(unitCode), token),
    enabled: Boolean(token),
  });
};

/** Gap kassalar ro'yxati. Odatiy holatda hammasi ko'rinadi. */
export const useMyGaps = (unitCode: GapUnitFilter) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [GAP_KEY, 'my', unitCode],
    queryFn: () => getMyGaps({ filter: toFilter(unitCode), token }),
    enabled: Boolean(token),
  });
};

/** Filter chiplari — qatnashayotgan guruhlardagi birliklar. */
export const useGapUnits = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [GAP_KEY, 'units'],
    queryFn: () => getGapUnits(token),
    enabled: Boolean(token),
  });
};

/**
 * Bitta guruh.
 *
 * Guruh ekrani route parametrlariga emas, shu so'rovga tayanadi: a'zo
 * qo'shilganda yoki yozuv tasdiqlanganda sarlavhadagi raqamlar ham
 * yangilanishi kerak.
 */
export const useGapGroup = (groupId: string) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [GAP_KEY, 'group', groupId],
    queryFn: () => getGapGroup(groupId, token),
    enabled: Boolean(token) && Boolean(groupId),
  });
};

/** Guruh a'zolari — qatorga bosilganda hisob-kitobi ochiladi. */
export const useGapMembers = (groupId: string) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [GAP_KEY, 'members', groupId],
    queryFn: () => getGapMembers(groupId, token),
    enabled: Boolean(token) && Boolean(groupId),
  });
};

/** Bitta a'zoning oldi-berdi tarixi. */
export const useGapMemberDetail = (memberId: string) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [GAP_KEY, 'member', memberId],
    queryFn: () => getGapMemberDetail(memberId, token),
    enabled: Boolean(token) && Boolean(memberId),
  });
};

// ---------------------------------------------------------------- yozish

/** Har qanday o'zgarishdan keyin butun gap bo'limi yangilanadi. */
const useGapInvalidate = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [GAP_KEY] });
};

export const useCreateGap = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useGapInvalidate();

  return useMutation({
    mutationFn: (dto: GapGroupCreateDTO) => createGap(dto, token),
    onSuccess: invalidate,
  });
};

export const useUpdateGap = (groupId: string) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useGapInvalidate();

  return useMutation({
    mutationFn: (dto: Partial<GapGroupCreateDTO>) => updateGap(groupId, dto, token),
    onSuccess: invalidate,
  });
};

export const useDeleteGap = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useGapInvalidate();

  return useMutation({
    mutationFn: (groupId: string) => deleteGap(groupId, token),
    onSuccess: invalidate,
  });
};

export const useAddGapMember = (groupId: string) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useGapInvalidate();

  return useMutation({
    mutationFn: (dto: GapMemberCreateDTO) => addGapMember(groupId, dto, token),
    onSuccess: invalidate,
  });
};

export const useRemoveGapMember = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useGapInvalidate();

  return useMutation({
    mutationFn: (memberId: string) => removeGapMember(memberId, token),
    onSuccess: invalidate,
  });
};

/** "Berdim" / "Oldim" — bitta yozuv, faqat yo'nalish teskari. */
export const useCreateGapTransfer = (groupId: string) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useGapInvalidate();

  return useMutation({
    mutationFn: (dto: GapTransferCreateDTO) => createGapTransfer(groupId, dto, token),
    onSuccess: invalidate,
  });
};

/** Qarama-qarshi tomon yozuvni tasdiqlaydi. */
export const useConfirmGapTransfer = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useGapInvalidate();

  return useMutation({
    mutationFn: (transferId: string) => confirmGapTransfer(transferId, token),
    onSuccess: invalidate,
  });
};

export const useDeleteGapTransfer = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useGapInvalidate();

  return useMutation({
    mutationFn: (transferId: string) => deleteGapTransfer(transferId, token),
    onSuccess: invalidate,
  });
};
