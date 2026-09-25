import { AppState, type AppStateStatus, Platform } from 'react-native';
import { storage } from '../../../shared/lib/storage';
import type { VoiceIntent } from '../api/voice';

/**
 * Tanilgan gapni SAQLAB TURADI, toki yozuv saqlanmaguncha.
 *
 * NEGA KERAK: ovozni yuborish pul turadi — tanib olish xizmati ham,
 * modelga so'rov ham har safar to'lanadi. Modal ochilib turganda dasturdan
 * chiqib kirilsa, React holati yo'qolardi va odam AYNAN SHU gapni qaytadan
 * aytishga majbur bo'lardi. Ikkinchi urinish esa birinchisidan qimmatroq
 * emas — u shunchaki bekorga to'langan pul.
 *
 * Saqlanadigani — tanishdan keyingi NATIJA, ovozning o'zi emas: natija
 * kichik va uni qayta ishlatish hech kimga qo'shimcha xarajat keltirmaydi.
 */

const KEY = 'voice.pendingIntent';

/**
 * Gap shuncha vaqt kutadi.
 *
 * Muddat kerak, chunki bir hafta oldingi gap o'z-o'zidan ochilsa, odam uni
 * bugungi deb o'ylab saqlab yuborishi mumkin. Yarim soat esa "chalg'idim,
 * qaytdim" uchun yetarli.
 */
const TTL_MS = 30 * 60 * 1000;

interface StoredIntent {
  savedAt: number;
  intent: VoiceIntent;
}

/**
 * Tiklash JS SEANSIGA bog'langan.
 *
 * Aks holda ro'yxatga har qaytganda oyna qayta ochilib, odamni qamab
 * qo'yardi. Sahifa yangilanganda bayroq ham nolga qaytadi — ya'ni
 * haqiqiy "chiqib-kirish"da tiklash baribir ishlaydi.
 */
let restoredThisSession = false;

export async function savePendingIntent(intent: VoiceIntent): Promise<void> {
  const payload: StoredIntent = { savedAt: Date.now(), intent };
  await storage.set(KEY, JSON.stringify(payload));
}

export async function clearPendingIntent(): Promise<void> {
  restoredThisSession = true;
  await storage.remove(KEY);
}

/**
 * Saqlangan gapni tiklash uchun oladi — seansda bir marta.
 *
 * Buzuq yoki eskirgan yozuv jimgina tashlanadi: yarim tushunilgan gapdan
 * yozuv yasashdan ko'ra, hech narsa qilmagan ma'qul.
 */
export async function takePendingIntent(): Promise<VoiceIntent | null> {
  if (restoredThisSession) return null;
  restoredThisSession = true;

  const raw = await storage.get(KEY);
  if (!raw) return null;

  let stored: StoredIntent;
  try {
    stored = JSON.parse(raw) as StoredIntent;
  } catch {
    await storage.remove(KEY);
    return null;
  }

  if (!stored?.intent?.understood || typeof stored.savedAt !== 'number') {
    await storage.remove(KEY);
    return null;
  }

  if (Date.now() - stored.savedAt > TTL_MS) {
    await storage.remove(KEY);
    return null;
  }

  return stored.intent;
}

/**
 * Dastur fonga chiqib QAYTGANDA tiklash yana ishlaydi.
 *
 * NEGA KERAK: ekran qulfi butun daraxtni yechadi - qulflanganda
 * RootNavigator faqat PIN oynasini qaytaradi. Qulf ochilgach ekranlar
 * noldan yig'iladi va tiklash aynan o'shanda kerak bo'ladi. Seans
 * bayrog'i esa o'sha paytgacha allaqachon sarflangan bo'lardi: dastur
 * ishga tushganda bir marta o'qilib, "tiklandi" deb belgilanardi.
 *
 * Bayroq qulf OCHILGANDA emas, dastur KO'RINGANDA nolga qaytariladi.
 * Ko'rinish qulfdan oldinroq sodir bo'ladi, ya'ni ekranlar yig'ilguncha
 * bayroq tayyor turadi. Teskari tartibda bola-effekt ota-effektdan oldin
 * ishlab, tiklash yana o'tkazib yuborilardi.
 */
export function watchForegroundForPendingVoice(): () => void {
  const onVisible = () => {
    restoredThisSession = false;
  };

  if (Platform.OS === 'web') {
    const handler = () => {
      if (document.visibilityState === 'visible') onVisible();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }

  const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') onVisible();
  });
  return () => sub.remove();
}

/** Faqat testlar uchun: seans bayrog'ini nolga qaytaradi. */
export function resetPendingVoiceSession(): void {
  restoredThisSession = false;
}
