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

/** Faqat testlar uchun: seans bayrog'ini nolga qaytaradi. */
export function resetPendingVoiceSession(): void {
  restoredThisSession = false;
}
