import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { API_BASE } from '../api/baseUrl';

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

/**
 * QAYTA ULANISHNI TEKSHIRUVCHI ZOND.
 *
 * Holat so'rovlar natijasidan olinadi, lekin oflaynda React Query
 * so'rovlarni TO'XTATADI — ya'ni natija beradigan hech narsa qolmaydi
 * va ilova oflayn holatda qotib qolardi. Zond shu halqani uzadi:
 * oflayn bo'lgan zahoti ishga tushadi va server javob bergani zahoti
 * o'chadi.
 *
 * Manzil ATAYIN `mobile/version`: u backendda ochiq (JWT talab
 * qilmaydi) va eng arzon endpoint. `fetch` ishlatiladi, `apiClient`
 * emas — aks holda interceptor zondning o'zini qayta holat yangilashga
 * chaqirib, aylanma hosil bo'lardi.
 */
const PROBE_INTERVAL_MS = 5_000;
let probeTimer: ReturnType<typeof setInterval> | null = null;

const probeOnce = async (): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    await fetch(`${API_BASE}/mobile/version`, { signal: controller.signal });
    clearTimeout(timeout);
    // Javob kelgani yetarli — 4xx bo'lsa ham server GAPIRYAPTI.
    emit(true);
  } catch {
    // Hali ham yo'q — keyingi urinishni taymer qiladi.
  }
};

const startProbe = (): void => {
  if (probeTimer) return;
  probeTimer = setInterval(probeOnce, PROBE_INTERVAL_MS);
};

const stopProbe = (): void => {
  if (!probeTimer) return;
  clearInterval(probeTimer);
  probeTimer = null;
};

const emit = (next: boolean): void => {
  if (online === next) return;
  online = next;
  if (next) stopProbe();
  else startProbe();
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

/**
 * Brauzerning o'z signali — zonddan TEZROQ.
 *
 * Wi-Fi uzilganda `offline` hodisasi darhol keladi, zond esa birinchi
 * yiqilgan so'rovni kutadi. Qaytganda ham shunday: `online` hodisasi
 * bo'lsa 5 soniya kutib o'tirmaymiz, darhol tekshiramiz.
 *
 * Telefonda bu hodisalar yo'q — u yerda zond yagona yo'l.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('offline', () => emit(false));
  window.addEventListener('online', () => {
    void probeOnce();
  });
}

/** Komponent ichida reaktiv tarmoq holati. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(networkStatus.subscribe, networkStatus.isOnline, () => true);
}
