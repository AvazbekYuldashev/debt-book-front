import {
  getNotificationPermission,
  requestNotificationPermission as requestWebPermission,
  showBrowserNotification,
  type NotifyPermission,
} from './webNotify';
import { ensureServiceWorker } from './serviceWorker';

// ============================================================
//  Qurilma bildirishnomalari — WEB implementatsiya (brauzer Notification API
//  + service worker). Native varianti: ./deviceNotifications.ts.
// ============================================================

export function initDeviceNotifications(): void {
  void ensureServiceWorker();
}

export async function getNotificationPermissionAsync(): Promise<NotifyPermission> {
  return getNotificationPermission();
}

export function requestNotificationPermission(onResult?: (permission: NotifyPermission) => void): void {
  requestWebPermission(onResult);
}

export function showDeviceNotification(title: string, body: string, tag: string): void {
  showBrowserNotification(title, body, tag);
}

/** Web'da sozlamalar sahifasini ochib bo'lmaydi — banner matni yo'riqnoma beradi. */
export function openNotificationSettings(): void {
  // noop
}

export type { NotifyPermission };
