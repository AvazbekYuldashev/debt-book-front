import { useSyncExternalStore } from 'react';

// ============================================================
//  Realtime (WebSocket) ulanish holatining yagona manbasi.
//  Query hook'lar shu holatga qarab polling oraliqlarini tanlaydi:
//  ulangan bo'lsa — sekin fallback, uzilgan bo'lsa — tez polling.
// ============================================================

type Listener = () => void;

let connected = false;
const listeners = new Set<Listener>();

export const realtimeStatus = {
  isConnected(): boolean {
    return connected;
  },
  setConnected(next: boolean): void {
    if (connected === next) return;
    connected = next;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** React komponent/hook ichida realtime ulanish holati (reaktiv). */
export function useRealtimeConnected(): boolean {
  return useSyncExternalStore(realtimeStatus.subscribe, realtimeStatus.isConnected, () => false);
}
