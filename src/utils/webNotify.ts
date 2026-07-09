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

/** Brauzer notification ruxsatini so'raydi (foydalanuvchi ishorasidan chaqirilishi afzal). */
export function requestNotificationPermission(): void {
  if (!hasNotification()) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => undefined);
  }
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

/** OS darajasidagi brauzer bildirishnomasini ko'rsatadi (ruxsat berilgan bo'lsa). */
export function showBrowserNotification(title: string, body: string, tag: string): void {
  if (!hasNotification() || Notification.permission !== 'granted') return;
  try {
    const popup = new Notification(title, { body, tag });
    popup.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore
      }
      popup.close();
    };
  } catch {
    // ignore
  }
}
