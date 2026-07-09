import { useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import type { PageResponse } from '../types/money';
import type { NotificationDTO } from '../types/notification';

/** O'qilmagan bildirishnomalar soni — badge uchun. Fokusda va davriy yangilanadi. */
export function useUnreadNotificationCount() {
  const { profile } = useContext(AuthContext);
  return useQuery({
    queryKey: ['notifications-unread', profile?.id],
    enabled: Boolean(profile?.jwt),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: () => getUnreadNotificationCount(profile!.jwt),
  });
}

/** Bildirishnomalar ro'yxati (inbox). */
export function useNotifications() {
  const { profile } = useContext(AuthContext);
  return useQuery({
    queryKey: ['notifications', profile?.id],
    enabled: Boolean(profile?.jwt),
    staleTime: 10_000,
    queryFn: () => getNotifications(1, 50, profile!.jwt),
  });
}

/** Bitta bildirishnomani o'qilgan deb belgilash (optimistik) + badge'ni yangilash. */
export function useMarkNotificationRead() {
  const { profile } = useContext(AuthContext);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id, profile?.jwt),
    onMutate: (id: string) => {
      queryClient.setQueryData<PageResponse<NotificationDTO>>(['notifications', profile?.id], (prev) =>
        prev
          ? { ...prev, content: prev.content.map((n) => (n.id === id ? { ...n, read: true } : n)) }
          : prev,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread', profile?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread', profile?.id] });
    },
  });
}
