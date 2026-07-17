import { Platform } from 'react-native';

// Faqat web'da (brauzer) ishlaydi; native'da barcha funksiyalar noop.
const isWeb = (): boolean => Platform.OS === 'web' && typeof window !== 'undefined';
const hasNotification = (): boolean => isWeb() && 'Notification' in window;

type AudioCtor = typeof AudioContext;
let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (!isWeb()) return null;
  const Ctor: AudioCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
};

// Bildirishnoma uchun service worker (bir marta ro'yxatdan o'tkaziladi).
// Mobil Chromium'da (Android Chrome/Edge) `new Notification()` ishlamaydi —
// faqat registration.showNotification orqali chiqadi.
let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function getNotificationSw(): Promise<ServiceWorkerRegistration | null> {
  if (!isWeb() || !('serviceWorker' in navigator)) return Promise.resolve(null);
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register('/service-worker.js')
      .then(() => navigator.serviceWorker.ready)
      .catch(() => null);
  }
  return swRegistrationPromise;
}

/** SW'ni oldindan ro'yxatdan o'tkazadi — birinchi bildirishnoma kechikmasligi uchun. */
export function initNotificationServiceWorker(): void {
  void getNotificationSw();
}

export type NotifyPermission = 'granted' | 'denied' | 'default' | 'unsupported';

/** Joriy brauzer bildirishnoma ruxsati (native/qo'llamaydigan muhitda 'unsupported'). */
export function getNotificationPermission(): NotifyPermission {
  if (!hasNotification()) return 'unsupported';
  return Notification.permission as NotifyPermission;
}

/**
 * Brauzer notification ruxsatini so'raydi (foydalanuvchi ishorasidan chaqirilishi
 * afzal). Natija ixtiyoriy callback orqali qaytadi — masalan, ruxsat berilganda
 * test bildirishnoma ko'rsatish uchun.
 */
export function requestNotificationPermission(onResult?: (permission: NotifyPermission) => void): void {
  if (!hasNotification()) {
    onResult?.('unsupported');
    return;
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission()
      .then((permission) => onResult?.(permission as NotifyPermission))
      .catch(() => onResult?.('default'));
    return;
  }
  onResult?.(Notification.permission as NotifyPermission);
}

/**
 * Audio kontekstini foydalanuvchi ishorasi bilan "ochadi" (unlock). Brauzerlar
 * avtomatik ovoz chalishni bloklaydi — shuning uchun bir marta bosilganda tayyorlaymiz.
 */
export function primeNotificationAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }
}

/** Qisqa "ding-dong" bildirishnoma ohangini chaladi (ilova ochiq bo'lganda). */
export function playNotificationBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    const now = ctx.currentTime;
    const ding = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    };
    ding(880, 0, 0.16);
    ding(1174, 0.17, 0.22);
  } catch {
    // ignore
  }
}

// Eski (sahifa-darajali) usul — SW bo'lmagan brauzerlar uchun zaxira.
function showLegacyNotification(title: string, options: NotificationOptions): void {
  const popup = new Notification(title, options);
  popup.onclick = () => {
    try {
      window.focus();
    } catch {
      // ignore
    }
    popup.close();
  };
}

/**
 * OS darajasidagi brauzer bildirishnomasini ko'rsatadi (ruxsat berilgan bo'lsa).
 * Asosiy yo'l — service worker (desktop + Android'da ishlaydi); SW bo'lmasa
 * `new Notification` zaxirasi (masalan, eski Safari).
 */
export function showBrowserNotification(title: string, body: string, tag: string): void {
  if (!hasNotification() || Notification.permission !== 'granted') return;
  const options: NotificationOptions = {
    body,
    tag,
    icon: '/favicon-32.png',
    badge: '/favicon-32.png',
  };
  getNotificationSw()
    .then((registration) => {
      if (registration) return registration.showNotification(title, options);
      showLegacyNotification(title, options);
      return undefined;
    })
    .catch(() => {
      try {
        showLegacyNotification(title, options);
      } catch {
        // mobil Chromium'da legacy konstruktor ishlamaydi — jim o'tamiz
      }
    });
}
