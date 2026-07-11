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
let channelReady = false;

// Android 8+ da bildirishnoma kanalsiz ko'rinmaydi; MAX importance = heads-up banner.
async function ensureChannel(): Promise<void> {
  if (channelReady) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Tranzaksiya bildirishnomalari',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  channelReady = true;
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
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    let mapped = mapStatus(current.status, current.canAskAgain);
    if (mapped === 'default') {
      const requested = await Notifications.requestPermissionsAsync();
      mapped = mapStatus(requested.status, requested.canAskAgain);
    }
    onResult?.(mapped);
  })().catch(() => onResult?.('default'));
}

/** Qurilma bildirishnomasini darhol ko'rsatadi (ovoz kanal orqali keladi). */
export function showDeviceNotification(title: string, body: string, tag: string): void {
  void ensureChannel()
    .then(() =>
      Notifications.scheduleNotificationAsync({
        identifier: tag,
        content: { title, body, sound: 'default' },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
      }),
    )
    .catch(() => undefined);
}

/** Ruxsat butunlay rad etilganda foydalanuvchini ilova sozlamalariga olib boradi. */
export function openNotificationSettings(): void {
  Linking.openSettings().catch(() => undefined);
}

export type { NotifyPermission };
