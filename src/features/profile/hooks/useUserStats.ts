import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../../auth/context/AuthContext';
import { getUserStats } from '../services/statisticsService';

const STATS_STALE_MS = 5 * 60_000;

/**
 * Ilova bo'yicha umumiy sonlar: ro'yxatdan o'tgan faol foydalanuvchilar va
 * raqami kiritilgan-u hali ro'yxatdan o'tmaganlar. Profil ekranida ko'rsatiladi.
 */
export function useUserStats() {
  const { profile } = useContext(AuthContext);
  return useQuery({
    queryKey: ['user-stats'],
    enabled: Boolean(profile?.jwt),
    staleTime: STATS_STALE_MS,
    refetchOnWindowFocus: false,
    queryFn: () => getUserStats(profile!.jwt),
  });
}
