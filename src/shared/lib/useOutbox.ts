import { useSyncExternalStore } from 'react';
import { outbox } from './outbox';

/**
 * Navbatda nechta amal yuborilmay turganini qaytaradi.
 *
 * `useSyncExternalStore` — navbat React'dan tashqarida yashaydi
 * (`apiClient` uni to'g'ridan-to'g'ri to'ldiradi), shuning uchun holat
 * kuzatuvchi orqali olinadi.
 */
export function useOutboxCount(): number {
  return useSyncExternalStore(
    outbox.subscribe,
    () => outbox.size(),
    () => 0,
  );
}
