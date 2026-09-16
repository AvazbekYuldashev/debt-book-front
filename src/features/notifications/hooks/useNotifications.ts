import { useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../auth/context/AuthContext';
import {
  clearPage,
  insertIntoPage,
  markAllReadInPage,
  markReadInPage,
  removeFromPage,
} from '../model/notificationCache';
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

/** `read` ham kalitga kiradi: o'qilgan va o'qilmagan ro'yxatlar alohida keshlanadi. */
export const notificationsQueryKey = (
  profileId?: string,
  businessId?: string | null,
  read?: boolean,
) => ['notifications', profileId, workspaceKey(businessId), read ?? 'all'] as const;
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
  /** Berilmasa hammasi — watcher aynan shu holatda ishlatadi. */
  read?: boolean;
}

/** Bildirishnomalar ro'yxati (inbox). Watcher ham AYNAN shu query'ni ulashadi. */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  return useQuery({
    queryKey: notificationsQueryKey(profile?.id, workspace.activeBusinessId, options.read),
    enabled: Boolean(profile?.jwt),
    staleTime: 10_000,
    refetchInterval: options.refetchInterval,
    refetchOnWindowFocus: options.refetchOnWindowFocus,
    queryFn: () => getNotifications(1, NOTIFICATIONS_PAGE_SIZE, options.read, profile!.jwt),
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
      const unreadKey = notificationsQueryKey(profile?.id, businessId, false);
      const readKey = notificationsQueryKey(profile?.id, businessId, true);
      const allKey = notificationsQueryKey(profile?.id, businessId);

      // Ko'chiriladigan elementning O'ZI kerak — uni o'qilganlar ro'yxatiga
      // qo'shish uchun. Avval o'qilmaganlardan, bo'lmasa aralash ro'yxatdan.
      const source =
        queryClient.getQueryData<PageResponse<NotificationDTO>>(unreadKey)?.content.find((n) => n.id === id) ??
        queryClient.getQueryData<PageResponse<NotificationDTO>>(allKey)?.content.find((n) => n.id === id);

      // O'qilmaganlardan DARHOL chiqadi — u yerda qolib ketishi ro'yxat
      // nomiga zid bo'lardi.
      queryClient.setQueryData<PageResponse<NotificationDTO>>(unreadKey, (prev) => removeFromPage(prev, id));

      // ...va DARHOL o'qilganlarga tushadi. Ilgari bu qadam yo'q edi: element
      // bir ro'yxatdan yo'qolib, ikkinchisida faqat server javobidan keyin
      // paydo bo'lardi — oradagi payt "yo'qolib qoldi" bo'lib ko'rinardi.
      if (source) {
        queryClient.setQueryData<PageResponse<NotificationDTO>>(readKey, (prev) =>
          insertIntoPage(prev, { ...source, read: true }),
        );
      }

      // Aralash ro'yxat (watcher) faqat belgilanadi — u yerdan yo'qolmasligi kerak.
      queryClient.setQueryData<PageResponse<NotificationDTO>>(allKey, (prev) => markReadInPage(prev, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey(profile?.id, businessId) });
      queryClient.invalidateQueries({ queryKey: unreadByWorkspaceQueryKey(profile?.id) });
      // O'qilganlar ro'yxatida endi bittaga ko'p — u ham yangilansin.
      queryClient.invalidateQueries({ queryKey: notificationsKeyPrefix(profile?.id) });
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
    onMutate: () => {
      const unreadKey = notificationsQueryKey(profile?.id, businessId, false);
      const readKey = notificationsQueryKey(profile?.id, businessId, true);
      const allKey = notificationsQueryKey(profile?.id, businessId);

      // Hamma o'qilmagan DARHOL o'qilganlar tomoniga ko'chadi.
      const moving = queryClient.getQueryData<PageResponse<NotificationDTO>>(unreadKey)?.content ?? [];
      queryClient.setQueryData<PageResponse<NotificationDTO>>(readKey, (prev) =>
        moving.reduce<PageResponse<NotificationDTO> | undefined>(
          (acc, item) => insertIntoPage(acc, { ...item, read: true }),
          prev,
        ),
      );
      queryClient.setQueryData<PageResponse<NotificationDTO>>(unreadKey, (prev) => clearPage(prev));
      queryClient.setQueryData<PageResponse<NotificationDTO>>(allKey, (prev) => markAllReadInPage(prev));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeyPrefix(profile?.id) });
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
