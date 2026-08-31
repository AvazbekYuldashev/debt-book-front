import { useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../auth/context/AuthContext';
import { WorkspaceContext } from '../../business/context/WorkspaceContext';
import {
  getNotifications,
  getUnreadByWorkspace,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import { useRealtimeConnected } from '../realtime/realtimeStatus';
import type { PageResponse } from '../../../shared/types/money';
import type { NotificationDTO } from '../types/notification';

const NOTIFICATIONS_PAGE_SIZE = 50;

// WS ulangan bo'lsa polling faqat sug'urta (siyrak); uzilganda tezlashadi.
export const NOTIFICATION_POLL_REALTIME_MS = 180_000;
export const NOTIFICATION_POLL_FALLBACK_MS = 25_000;
const UNREAD_POLL_REALTIME_MS = 180_000;
const UNREAD_POLL_FALLBACK_MS = 30_000;

// Kalitga ish maydoni ham kiradi: shaxsiy va biznes pochtasi alohida
// keshlanadi, aks holda maydon almashganda bir zumga eski ro'yxat ko'rinardi.
// Ish maydoni OXIRGI element - shuning uchun `[..., profileId]` prefiksi bilan
// invalidatsiya qilinsa BARCHA maydonlar birdan yangilanadi (WS xabari
// qaysi maydonga tegishli ekanini bilmaydi).
const workspaceKey = (businessId?: string | null) => businessId ?? 'personal';

export const notificationsQueryKey = (profileId?: string, businessId?: string | null) =>
  ['notifications', profileId, workspaceKey(businessId)] as const;
export const unreadCountQueryKey = (profileId?: string, businessId?: string | null) =>
  ['notifications-unread', profileId, workspaceKey(businessId)] as const;

/** WS xabari kelganda: barcha ish maydonlarini birdan yangilash uchun prefiks. */
export const notificationsKeyPrefix = (profileId?: string) => ['notifications', profileId] as const;
export const unreadCountKeyPrefix = (profileId?: string) => ['notifications-unread', profileId] as const;

/** O'qilmagan bildirishnomalar soni — badge uchun. WS holatiga qarab polling. */
export function useUnreadNotificationCount() {
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const realtimeConnected = useRealtimeConnected();
  return useQuery({
    queryKey: unreadCountQueryKey(profile?.id, workspace.activeBusinessId),
    enabled: Boolean(profile?.jwt),
    staleTime: 15_000,
    refetchInterval: realtimeConnected ? UNREAD_POLL_REALTIME_MS : UNREAD_POLL_FALLBACK_MS,
    refetchOnWindowFocus: true,
    queryFn: () => getUnreadNotificationCount(profile!.jwt),
  });
}

interface UseNotificationsOptions {
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
}

/** Bildirishnomalar ro'yxati (inbox). Watcher ham AYNAN shu query'ni ulashadi. */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  return useQuery({
    queryKey: notificationsQueryKey(profile?.id, workspace.activeBusinessId),
    enabled: Boolean(profile?.jwt),
    staleTime: 10_000,
    refetchInterval: options.refetchInterval,
    refetchOnWindowFocus: options.refetchOnWindowFocus,
    queryFn: () => getNotifications(1, NOTIFICATIONS_PAGE_SIZE, profile!.jwt),
  });
}

/** Bitta bildirishnomani o'qilgan deb belgilash (optimistik) + badge'ni yangilash. */
export function useMarkNotificationRead() {
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const businessId = workspace.activeBusinessId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id, profile?.jwt),
    onMutate: (id: string) => {
      queryClient.setQueryData<PageResponse<NotificationDTO>>(
        notificationsQueryKey(profile?.id, businessId),
        (prev) =>
          prev
            ? { ...prev, content: prev.content.map((n) => (n.id === id ? { ...n, read: true } : n)) }
            : prev,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey(profile?.id, businessId) });
      queryClient.invalidateQueries({ queryKey: unreadByWorkspaceQueryKey(profile?.id) });
    },
  });
}

/** Hammasini o'qilgan deb belgilash + ro'yxat va badge'ni yangilash. */
export function useMarkAllNotificationsRead() {
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const businessId = workspace.activeBusinessId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(profile?.jwt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey(profile?.id, businessId) });
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey(profile?.id, businessId) });
      queryClient.invalidateQueries({ queryKey: unreadByWorkspaceQueryKey(profile?.id) });
    },
  });
}

export const unreadByWorkspaceQueryKey = (profileId?: string) =>
  ['notifications-unread-by-workspace', profileId] as const;

/**
 * Har bir ish maydonidagi o'qilmaganlar soni.
 *
 * Bildirishnomalar maydonlarga ajratilgandan keyin, shaxsiyda turgan odam
 * biznesida yangi xabar borligini boshqa bilmay qolardi. Bu so'rov almashtirgichda
 * kichik nuqta chizish uchun - xabarning O'ZI baribir faqat o'z maydonida qoladi.
 */
export function useUnreadByWorkspace() {
  const { profile } = useContext(AuthContext);
  const realtimeConnected = useRealtimeConnected();
  return useQuery({
    queryKey: unreadByWorkspaceQueryKey(profile?.id),
    enabled: Boolean(profile?.jwt),
    staleTime: 15_000,
    refetchInterval: realtimeConnected ? UNREAD_POLL_REALTIME_MS : UNREAD_POLL_FALLBACK_MS,
    refetchOnWindowFocus: true,
    queryFn: () => getUnreadByWorkspace(profile!.jwt),
  });
}
