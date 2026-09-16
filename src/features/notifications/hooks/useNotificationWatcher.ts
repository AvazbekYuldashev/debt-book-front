import { useContext, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../auth/context/AuthContext';
import {
  NOTIFICATION_POLL_FALLBACK_MS,
  NOTIFICATION_POLL_REALTIME_MS,
  notificationsKeyPrefix,
  unreadByWorkspaceQueryKey,
  unreadCountKeyPrefix,
  useNotifications,
} from './useNotifications';
import { NotificationsSocket } from '../realtime/notificationsSocket';
import { realtimeStatus, useRealtimeConnected } from '../realtime/realtimeStatus';
import { translate } from '../../../shared/i18n';
import {
  initDeviceNotifications,
  requestNotificationPermission,
  showDeviceNotification,
} from '../../../shared/lib/deviceNotifications';
import { playNotificationBeep } from '../../../shared/lib/webNotify';
import { selectNotificationsToPopup } from '../model/popupSelection';

/**
 * Yangi bildirishnomalarni kuzatadi: asosiy kanal — WebSocket (real-time),
 * fallback — polling. WS xabari kelganda inbox va badge query'lari darhol
 * invalidatsiya qilinadi; ulanish tushsa polling avtomatik tezlashadi.
 * Web'da yangi bildirishnoma uchun ovoz + brauzer popup'i chiqadi.
 * Ilova ildizida (login qilingan) bir marta mount qilinadi.
 */
export function useNotificationWatcher(): void {
  const { profile } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const realtimeConnected = useRealtimeConnected();
  /**
   * Shu SEANSDA popup chiqarilgan id'lar.
   *
   * Xotirada saqlanadi, ataylab: ilova qayta ochilganda bo'shaydi va hali
   * O'QILMAGAN xabar yana bir marta eslatib o'tadi. Ish maydoni almashganda
   * esa saqlanib qoladi — aks holda maydonga o'tish butun ro'yxatni "yangi"
   * deb ko'rsatib, popup yog'dirardi.
   */
  const notifiedRef = useRef<Set<string>>(new Set());

  // Ruxsat so'rash + kanal/SW tayyorlash (bir marta). Native'da bu Android 13+
  // tizim dialogini chiqaradi — ilova birinchi ochilishida ruxsat so'raladi.
  useEffect(() => {
    requestNotificationPermission();
    initDeviceNotifications();
  }, []);

  // Foydalanuvchi almashsa — holatni tozalaymiz.
  useEffect(() => {
    notifiedRef.current = new Set();
  }, [profile?.id]);

  // WebSocket hayot sikli: login bo'lganda ochiladi, chiqishda/token almashganda yopiladi.
  const profileId = profile?.id;
  const jwt = profile?.jwt;
  useEffect(() => {
    if (!jwt) return undefined;
    const socket = new NotificationsSocket({
      token: jwt,
      onNotification: () => {
        // Prefiks bo'yicha: WS xabari qaysi ish maydoniga tegishli ekanini
        // bilmaydi, shuning uchun shaxsiy ham, barcha bizneslar ham yangilanadi.
        queryClient.invalidateQueries({ queryKey: notificationsKeyPrefix(profileId) });
        queryClient.invalidateQueries({ queryKey: unreadCountKeyPrefix(profileId) });
        queryClient.invalidateQueries({ queryKey: unreadByWorkspaceQueryKey(profileId) });
        // Tranzaksiya bildirishnomasi = balans o'zgardi: ro'yxat va balanslar ham
        // darhol yangilanadi (prefiks bo'yicha — barcha account key'lar).
        queryClient.invalidateQueries({ queryKey: ['contact-balances'] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      },
      onConnectedChange: (connected) => realtimeStatus.setConnected(connected),
    });
    socket.start();
    return () => {
      socket.stop();
      realtimeStatus.setConnected(false);
    };
  }, [jwt, profileId, queryClient]);

  // Inbox bilan bitta query ulashiladi; WS ulanganida polling siyraklashadi.
  const { data } = useNotifications({
    refetchInterval: realtimeConnected ? NOTIFICATION_POLL_REALTIME_MS : NOTIFICATION_POLL_FALLBACK_MS,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const items = data?.content ?? [];
    if (items.length === 0) return;

    // Qaror mantiqi sof funksiyada — u yerda sinaladi (popupSelection).
    const { toShow, toRemember } = selectNotificationsToPopup(items, notifiedRef.current);
    toRemember.forEach((id) => notifiedRef.current.add(id));
    if (toShow.length === 0) return;

    // Web'da ovozli signal (native'da ovoz bildirishnomaning o'zi bilan keladi)
    // + qurilma bildirishnomasi (ruxsat bo'lsa).
    playNotificationBeep();
    const title = translate('common.appName');
    toShow.forEach((item) => {
      showDeviceNotification(title, item.message, item.id);
    });
  }, [data]);
}
