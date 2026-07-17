import { useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../auth/context/AuthContext';
import {
  getNotifications,
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

export const notificationsQueryKey = (profileId?: string) => ['notifications', profileId] as const;
export const unreadCountQueryKey = (profileId?: string) => ['notifications-unread', profileId] as const;

/** O'qilmagan bildirishnomalar soni — badge uchun. WS holatiga qarab polling. */
export function useUnreadNotificationCount() {
  const { profile } = useContext(AuthContext);
  const realtimeConnected = useRealtimeConnected();
  return useQuery({
    queryKey: unreadCountQueryKey(profile?.id),
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
  return useQuery({
    queryKey: notificationsQueryKey(profile?.id),
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id, profile?.jwt),
    onMutate: (id: string) => {
      queryClient.setQueryData<PageResponse<NotificationDTO>>(notificationsQueryKey(profile?.id), (prev) =>
        prev
          ? { ...prev, content: prev.content.map((n) => (n.id === id ? { ...n, read: true } : n)) }
          : prev,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey(profile?.id) });
    },
  });
}

/** Hammasini o'qilgan deb belgilash + ro'yxat va badge'ni yangilash. */
export function useMarkAllNotificationsRead() {
  const { profile } = useContext(AuthContext);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(profile?.jwt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey(profile?.id) });
      queryClient.invalidateQueries({ queryKey: unreadCountQueryKey(profile?.id) });
    },
  });
}
