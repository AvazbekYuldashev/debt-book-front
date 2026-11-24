import { Platform } from 'react-native';

// ============================================================
//  XIZMAT ISHCHISINI (service worker) ULASH — yagona joy.
//
//  Ishchi ikki vazifani bajaradi: ilova qobig'ini keshlaydi
//  (oflaynda ochilishi uchun) va bildirishnoma ko'rsatadi. Ikkisi
//  bitta faylga tegishli, shuning uchun ro'yxatga olish ham bitta
//  joyda — ikki marta `register` chaqirilsa brauzer ikkinchisini
//  birinchisining ustiga qo'yib, kutilmagan holat yasaydi.
//
//  DASTUR OCHILGANDA ulanadi, bildirishnoma so'ralganda emas:
//  qobiq keshlanishi uchun ishchi BIRINCHI tashrifda ishga tushishi
//  kerak. Aks holda odam internetsiz qolganda brauzer "internet
//  yo'q" sahifasini ko'rsatar va qurilmadagi kesh behuda yotardi —
//  uni ko'rsatadigan ilova yuklanmaydi.
// ============================================================

const isWeb = (): boolean => Platform.OS === 'web' && typeof window !== 'undefined';

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Ishchini ro'yxatdan o'tkazadi (bir marta) va tayyor bo'lganini qaytaradi.
 *
 * Native'da va ishchini qo'llamaydigan brauzerda `null` qaytaradi —
 * chaqiruvchi tomonda alohida tekshiruv kerak emas.
 */
export const ensureServiceWorker = (): Promise<ServiceWorkerRegistration | null> => {
  if (!isWeb() || !('serviceWorker' in navigator)) return Promise.resolve(null);
  if (!registration) {
    registration = navigator.serviceWorker
      .register('/service-worker.js')
      .then(() => navigator.serviceWorker.ready)
      .catch(() => null);
  }
  return registration;
};
