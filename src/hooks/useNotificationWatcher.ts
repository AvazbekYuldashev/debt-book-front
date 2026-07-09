import { useContext, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { getNotifications } from '../services/notificationService';
import { translate } from '../i18n';
import {
  playNotificationBeep,
  requestNotificationPermission,
  showBrowserNotification,
} from '../utils/webNotify';

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
    requestNotificationPermission();
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

    // Ovozli signal (ilova ochiq bo'lsa kafolatlangan) + OS bildirishnomasi (ruxsat bo'lsa).
    playNotificationBeep();
    const title = translate('common.appName');
    // content DESC (yangi birinchi) — eskidan yangiga qarab ko'rsatamiz.
    [...fresh].reverse().forEach((item) => {
      showBrowserNotification(title, item.message, item.id);
    });
  }, [data]);
}
