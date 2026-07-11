import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { NotifyPermission } from './webNotify';

// ============================================================
//  Qurilma bildirishnomalari — NATIVE (Android/iOS) implementatsiya.
//  Web varianti: ./deviceNotifications.web.ts (brauzer Notification + SW).
//  expo-notifications faqat shu faylda import qilinadi — web bundle'ga
//  tushmaydi (webpack .web.ts ni tanlaydi).
// ============================================================

// Ilova OCHIQ (foreground) paytida ham banner + ovoz ko'rinsin.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'transactions';
let channelAttempted = false;
let channelCreated = false;

// Android 8+ da bildirishnoma kanalsiz ko'rinmaydi; MAX importance = heads-up banner.
// Kanal yaratish yiqilsa ham (ba'zi qurilmalarda SecurityException bo'lishi mumkin)
// bildirishnoma default kanal orqali baribir chiqadi (trigger: null fallback).
async function ensureChannel(): Promise<void> {
  if (channelAttempted || Platform.OS !== 'android') {
    channelAttempted = true;
    return;
  }
  channelAttempted = true;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Tranzaksiya bildirishnomalari',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
    channelCreated = true;
  } catch {
    channelCreated = false;
  }
}

function mapStatus(status: string, canAskAgain: boolean): NotifyPermission {
  if (status === 'granted') return 'granted';
  if (status === 'undetermined') return 'default';
  return canAskAgain ? 'default' : 'denied';
}

/** Kanalni oldindan tayyorlaydi (ilova ochilishida bir marta). */
export function initDeviceNotifications(): void {
  void ensureChannel().catch(() => undefined);
}

export async function getNotificationPermissionAsync(): Promise<NotifyPermission> {
  try {
    const current = await Notifications.getPermissionsAsync();
    return mapStatus(current.status, current.canAskAgain);
  } catch {
    return 'unsupported';
  }
}

/** Ruxsat so'raydi (Android 13+ tizim dialogi); natijani callback bilan qaytaradi. */
export function requestNotificationPermission(onResult?: (permission: NotifyPermission) => void): void {
  (async () => {
    // Kanal xatosi ruxsat so'rovini to'sib qo'ymasin — alohida oqimlar.
    const current = await Notifications.getPermissionsAsync();
    let mapped = mapStatus(current.status, current.canAskAgain);
    if (mapped === 'default') {
      const requested = await Notifications.requestPermissionsAsync();
      mapped = mapStatus(requested.status, requested.canAskAgain);
    }
    void ensureChannel();
    onResult?.(mapped);
  })().catch(() => onResult?.('default'));
}

/** Qurilma bildirishnomasini darhol ko'rsatadi (ovoz kanal orqali keladi). */
export function showDeviceNotification(title: string, body: string, tag: string): void {
  void (async () => {
    await ensureChannel();
    const content = { title, body, sound: 'default' as const };
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: tag,
        content,
        trigger: Platform.OS === 'android' && channelCreated ? { channelId: CHANNEL_ID } : null,
      });
    } catch {
      // Kanal triggeri ishlamasa — default kanal bilan qayta urinamiz.
      try {
        await Notifications.scheduleNotificationAsync({ identifier: tag, content, trigger: null });
      } catch {
        // oxirgi chora ham yiqildi — jim o'tamiz
      }
    }
  })();
}

/** Ruxsat butunlay rad etilganda foydalanuvchini ilova sozlamalariga olib boradi. */
export function openNotificationSettings(): void {
  Linking.openSettings().catch(() => undefined);
}

export type { NotifyPermission };
