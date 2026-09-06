import { useSyncExternalStore } from 'react';

// ============================================================
//  Tarmoq holatining yagona manbai.
//
//  Nega NetInfo emas: `@react-native-community/netinfo` loyihada yo'q va u
//  native modul (qo'shilsa EAS build qayta kerak). Buning o'rniga holat
//  HAQIQIY so'rovlar natijasidan olinadi: axios javob bersa — onlayn;
//  javobsiz (network error / timeout) qolsa — oflayn. Bu "radio yoqilganmi"
//  emas, "server bilan gaplasha olyapmizmi" degan savolga javob beradi —
//  foydalanuvchi uchun aynan shu muhim.
// ============================================================

type Listener = () => void;

let online = true;
const listeners = new Set<Listener>();

const emit = (next: boolean): void => {
  if (online === next) return;
  online = next;
  listeners.forEach((listener) => listener());
};

export const networkStatus = {
  isOnline(): boolean {
    return online;
  },
  /** Har muvaffaqiyatli javobdan keyin chaqiriladi. */
  markOnline(): void {
    emit(true);
  },
  /** Faqat javobsiz (transport) xatoda chaqiriladi — 4xx/5xx bunga kirmaydi. */
  markOffline(): void {
    emit(false);
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Komponent ichida reaktiv tarmoq holati. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(networkStatus.subscribe, networkStatus.isOnline, () => true);
}
