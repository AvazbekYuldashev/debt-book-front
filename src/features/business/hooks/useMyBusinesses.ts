import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../../auth/context/AuthContext';
import { getMyBusinesses } from '../services/businessService';

/** Bir profil bizneslari uchun yagona query kaliti — cache yangilash/invalidatsiya shu orqali. */
export const myBusinessesQueryKey = (profileId?: string) => ['my-businesses', profileId] as const;

/**
 * Foydalanuvchi bizneslari ro'yxati. WorkspaceSwitcher, MyBusinesses va Profile
 * bir xil so'rovni ulashadi — Query dedupe qiladi, har instansiya alohida
 * so'rov yubormaydi (avval 2-3 parallel so'rov ketardi).
 */
export function useMyBusinesses(enabled = true) {
  const { profile } = useContext(AuthContext);
  return useQuery({
    queryKey: myBusinessesQueryKey(profile?.id),
    enabled: enabled && Boolean(profile?.jwt),
    staleTime: 30_000,
    queryFn: () => getMyBusinesses(profile!.jwt),
  });
}
