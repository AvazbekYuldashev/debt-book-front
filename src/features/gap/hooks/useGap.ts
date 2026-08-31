import { useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../auth/context/AuthContext';
import {
  addGapMember,
  closeGapPeriod,
  confirmGapPaid,
  createGap,
  getGapGroup,
  getGapMembers,
  getGapShareDetail,
  getGapSummary,
  getGapUnits,
  getMyGaps,
  markGapPaid,
  redrawPeriod,
  setPeriodReceiver,
  startGap,
  type GapCreateInput,
  type GapMemberInput,
} from '../services/gapService';
import type { GapFilterDTO, GapUnitFilter } from '../types/gap';

const GAP_KEY = 'gap';

/** 'ALL' bo'lsa filtersiz so'rov ketadi — backend hamma valyutani qaytaradi. */
const toFilter = (unitCode: GapUnitFilter): GapFilterDTO =>
  unitCode === 'ALL' ? {} : { unitCode };

/**
 * Statistika paneli. Odatiy holatda ('ALL') har valyuta alohida qaytadi —
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

/** Guruh a'zolari — qatorga bosilganda ochiladigan ekran uchun. */
export const useGapMembers = (groupId: string) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [GAP_KEY, 'members', groupId],
    queryFn: () => getGapMembers(groupId, token),
    enabled: Boolean(token) && Boolean(groupId),
  });
};

/** Bitta a'zoning hisob-kitobi — qatorga bosilganda ochiladigan oyna. */
export const useGapShareDetail = (shareId: string) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [GAP_KEY, 'share', shareId],
    queryFn: () => getGapShareDetail(shareId, token),
    enabled: Boolean(token) && Boolean(shareId),
  });
};

/** Filter chiplari — foydalanuvchi qatnashayotgan guruhlardagi birliklar. */
export const useGapUnits = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [GAP_KEY, 'units'],
    queryFn: () => getGapUnits(token),
    enabled: Boolean(token),
  });
};

/** Gap kassa yaratish. Muvaffaqiyatda ro'yxat va statistika keshi tozalanadi. */
export const useCreateGap = () => {
  const { profile } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: GapCreateInput) => createGap(dto, profile?.jwt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GAP_KEY] });
    },
  });
};

/** Siklni boshlash. */
export const useStartGap = () => {
  const { profile } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => startGap(groupId, profile?.jwt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GAP_KEY] });
    },
  });
};

/** Guruhga a'zo qo'shish. */
export const useAddGapMember = (groupId: string) => {
  const { profile } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: GapMemberInput) => addGapMember(groupId, dto, profile?.jwt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GAP_KEY] });
    },
  });
};

/** Joriy davrning oluvchisini belgilash (har oyda rejimi). */
export const useSetPeriodReceiver = (groupId: string) => {
  const { profile } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { periodNumber: number; shareId: string | null }) =>
      setPeriodReceiver(groupId, vars.periodNumber, vars.shareId, profile?.jwt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GAP_KEY] });
    },
  });
};

/** Qayta qur'a — oxirgi belgilangan davr uchun. */
export const useRedrawPeriod = (groupId: string) => {
  const { profile } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (periodNumber: number | null) =>
      redrawPeriod(groupId, periodNumber, profile?.jwt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GAP_KEY] });
    },
  });
};

/** "Berdim" / "Oldim" amallari. */
export const useGapPaymentAction = () => {
  const { profile } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { paymentId: string; amount: number | null; confirm: boolean }) =>
      vars.confirm
        ? confirmGapPaid(vars.paymentId, profile?.jwt)
        : markGapPaid(vars.paymentId, vars.amount, profile?.jwt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GAP_KEY] });
    },
  });
};

/** Davrni yopib keyingisiga o'tish. */
export const useCloseGapPeriod = (groupId: string) => {
  const { profile } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => closeGapPeriod(groupId, profile?.jwt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GAP_KEY] });
    },
  });
};

/**
 * Guruhning joriy holati.
 *
 * Detal ekrani davr raqami va statusni shundan oladi: amal bajarilgach
 * (davr yopilishi, sikl boshlanishi) ular o'zgaradi, route parametridagi
 * nusxa esa eskirib qolardi va foydalanuvchini ekrandan chiqarishga
 * majbur qilardi.
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
