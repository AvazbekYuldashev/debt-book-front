import { useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { getNotifications } from '../services/notificationService';
import { translate } from '../i18n';

// Brauzer (web) Notification API mavjudligini tekshiradi.
const isWebNotificationSupported = (): boolean =>
  Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window;

/**
 * Yangi bildirishnomalarni kuzatadi va web'da brauzer Notification popup'i ("SMS
 * kelgani kabi" alohida bildirishnoma) ko'rsatadi. Native'da faqat ma'lumotni
 * yangilaydi (popup yo'q). Ilova ildizida (login qilingan) bir marta mount qilinadi.
 */
export function useNotificationWatcher(): void {
  const { profile } = useContext(AuthContext);
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Ruxsat so'rash (bir marta).
  useEffect(() => {
    if (!isWebNotificationSupported()) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  // Foydalanuvchi almashsa — holatni tozalaymiz.
  useEffect(() => {
    seenRef.current = new Set();
    initializedRef.current = false;
  }, [profile?.id]);

  const { data } = useQuery({
    queryKey: ['notifications', profile?.id],
    enabled: Boolean(profile?.jwt),
    refetchInterval: 25_000,
    refetchOnWindowFocus: true,
    queryFn: () => getNotifications(1, 20, profile!.jwt),
  });

  useEffect(() => {
    const items = data?.content ?? [];
    if (items.length === 0) return;

    // Birinchi yuklovda: barchasini "ko'rilgan" deb belgilaymiz (eski bildirishnomalar
    // uchun popup chiqarmaymiz).
    if (!initializedRef.current) {
      items.forEach((item) => seenRef.current.add(item.id));
      initializedRef.current = true;
      return;
    }

    const fresh = items.filter((item) => !seenRef.current.has(item.id));
    fresh.forEach((item) => seenRef.current.add(item.id));
    if (fresh.length === 0) return;

    if (!isWebNotificationSupported() || Notification.permission !== 'granted') return;

    // content DESC (yangi birinchi) — eskidan yangiga qarab ko'rsatamiz.
    [...fresh].reverse().forEach((item) => {
      try {
        const popup = new Notification(translate('common.appName'), {
          body: item.message,
          tag: item.id,
        });
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
    });
  }, [data]);
}
