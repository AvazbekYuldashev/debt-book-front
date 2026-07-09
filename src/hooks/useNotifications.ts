import { useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from '../services/notificationService';

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
