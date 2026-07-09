import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { getSelectableBusinessMembers } from '../services/businessService';

/**
 * Counterparty biznesning tanlanadigan a'zolari. `businessId` bo'sh bo'lsa so'rov
 * yuborilmaydi; natija query keshida turadi (modal qayta ochilganda flicker yo'q).
 */
export function useSelectableBusinessMembers(businessId: string, enabled = true) {
  const { profile } = useContext(AuthContext);
  return useQuery({
    queryKey: ['business-members-selectable', businessId],
    enabled: enabled && Boolean(businessId) && Boolean(profile?.jwt),
    staleTime: 60_000,
    queryFn: () => getSelectableBusinessMembers(businessId, profile!.jwt),
  });
}
