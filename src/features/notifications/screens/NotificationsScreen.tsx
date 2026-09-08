import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, type ListRenderItem, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import type { DebtsScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import EmptyState from '../../../shared/ui/EmptyState';
import EntranceView from '../../../shared/ui/EntranceView';
import { useNotifications, useMarkNotificationRead } from '../hooks/useNotifications';
import { ContactsContext } from '../../debts/context/ContactsContext';
import { normalizePhone } from '../../../shared/lib/phone';
import {
  getNotificationPermissionAsync,
  openNotificationSettings,
  requestNotificationPermission,
  showDeviceNotification,
  type NotifyPermission,
} from '../../../shared/lib/deviceNotifications';
import type { NotificationDTO } from '../types/notification';
import NotificationRow from '../components/NotificationRow';

type Props = DebtsScreenProps<typeof ROUTES.NOTIFICATIONS>;

const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Standart ko'rinish — O'QILMAGANLAR. Aynan ular uchun bu ekranga kiriladi;
  // o'qilganlar tarix sifatida qo'shni bo'limda qoladi.
  const [showRead, setShowRead] = useState(false);
  const { data, isLoading, isRefetching, refetch } = useNotifications({ read: showRead });
  const { mutate: markReadMutate } = useMarkNotificationRead();
  const { contacts } = useContext(ContactsContext);

  const items = data?.content ?? [];

  // Qurilma bildirishnomasi ruxsati — 'granted' bo'lmasa banner chiqadi.
  // Boshlang'ich 'granted' (banner miltillamasin), haqiqiy holat async keladi.
  const [pushPermission, setPushPermission] = useState<NotifyPermission>('granted');

  useEffect(() => {
    let mounted = true;
    getNotificationPermissionAsync().then((permission) => {
      if (mounted) setPushPermission(permission);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleEnablePush = useCallback(() => {
    // Butunlay rad etilgan: so'rab bo'lmaydi — native'da sozlamalarni ochamiz.
    if (pushPermission === 'denied' && Platform.OS !== 'web') {
      openNotificationSettings();
      return;
    }
    requestNotificationPermission((permission) => {
      setPushPermission(permission);
      // Ruxsat berilishi bilan test bildirishnoma — qurilmada ishlayotgani darhol ko'rinadi.
      if (permission === 'granted') {
        showDeviceNotification(t('common.appName'), t('notifications.pushTest'), 'push-test');
      }
    });
  }, [pushPermission, t]);

  // Bildirishnomani bosganda: faqat o'shani o'qilgan qilamiz va (topilsa) o'sha
  // kontakt/tranzaksiya ekraniga yo'naltiramiz. Inbox ochilishida hech narsa
  // avtomatik o'qilmaydi.
  const handlePress = useCallback(
    (notification: NotificationDTO) => {
      if (!notification.read) markReadMutate(notification.id);
      // Avval ANIQ tomon bo'yicha: bildirishnoma o'zi qaysi kontaktga
      // tegishli ekanini aytadi. Telefon bo'yicha qidirish yaramaydi -
      // odam biznes nomidan ish ko'rgan bo'lsa, tranzaksiya BIZNES
      // kontaktida yotadi, biznesning esa telefoni yo'q.
      const byParty = notification.counterpartyId
        ? contacts.find(
            (item) =>
              item.partyId === notification.counterpartyId
              && (!notification.counterpartyType
                || item.partyType === notification.counterpartyType),
          )
        : undefined;

      // Eski bildirishnomalarda tomon saqlanmagan - o'shanda telefonga qaytamiz.
      const actorPhone = notification.actorPhone ? normalizePhone(notification.actorPhone) : '';
      const byPhone = actorPhone
        ? contacts.find((item) => item.phone && normalizePhone(item.phone) === actorPhone)
        : undefined;

      const contact = byParty ?? byPhone;
      if (contact) {
        navigation.navigate(ROUTES.CONTACT_DETAIL, { id: contact.id });
      }
    },
    [markReadMutate, contacts, navigation],
  );

  // Ro'yxat virtualizatsiyalangan (FlatList) — faqat ko'rinadigan qatorlar render qilinadi.
  const lastIndex = items.length - 1;
  const renderNotification = useCallback<ListRenderItem<NotificationDTO>>(
    ({ item, index }) => (
      <NotificationRow notification={item} isLast={index === lastIndex} onPress={handlePress} />
    ),
    [lastIndex, handlePress],
  );

  const keyExtractor = useCallback((item: NotificationDTO) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Dekorativ fon — boshqa ekranlar bilan bir xil "imzo" qatlami. */}
      <AmbientBackground />

      <EntranceView duration={300} fromY={12}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={navigation.goBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={6}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('notifications.title')}</Text>
        {/* Test tugmasi: qurilma bildirishnomasi yo'lini bir bosishda tekshiradi. */}
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={handleEnablePush}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.pushTest')}
          hitSlop={6}
        >
          <Ionicons name="notifications" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {pushPermission === 'default' || pushPermission === 'denied' ? (
        <Pressable
          style={({ pressed }) => [styles.permissionBanner, pressed && styles.pressed]}
          onPress={handleEnablePush}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.enablePush')}
        >
          <Ionicons
            name={pushPermission === 'denied' ? 'notifications-off-outline' : 'notifications-outline'}
            size={18}
            color={pushPermission === 'denied' ? colors.danger : colors.primary}
          />
          <Text style={styles.permissionText}>
            {pushPermission === 'denied'
              ? Platform.OS === 'web'
                ? t('notifications.pushBlocked')
                : t('notifications.pushBlockedNative')
              : t('notifications.enablePush')}
          </Text>
        </Pressable>
      ) : null}
      </EntranceView>

      {/* Ikki bo'lim: o'qilmaganlar va o'qilganlar. Ro'yxat SERVERDA
          ajratiladi — aralash kelsa, o'qilganlar 50 talik sahifada
          o'qilmaganlarni siqib chiqarardi. */}
      <View style={styles.segments}>
        {([false, true] as const).map((value) => {
          const active = showRead === value;
          return (
            <Pressable
              key={String(value)}
              onPress={() => setShowRead(value)}
              style={[styles.segment, active && styles.segmentActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {value ? t('notifications.tabRead') : t('notifications.tabUnread')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        style={styles.scroll}
        contentContainerStyle={styles.listCard}
        data={items}
        renderItem={renderNotification}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={11}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          // Skeleton faqat BIRINCHI yuklashda: mavjud ro'yxat fon
          // yangilanishida kulrang chiziqlarga almashmaydi.
          isLoading ? (
            <SkeletonContactList count={5} />
          ) : (
            <EmptyState
              icon="notifications-outline"
              // Bo'sh holat bo'limga qarab: "bildirishnoma yo'q" deyish
              // qo'shni bo'limda xabar turgan paytda chalg'ituvchi bo'lardi.
              title={showRead ? t('notifications.emptyRead') : t('notifications.empty')}
            />
          )
        }
      />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // Fon AmbientBackground'dan keladi — tekis rang berilmaydi.
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      ...glass.pane,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segments: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginHorizontal: spacing.md,
      marginBottom: spacing.xs,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      ...glass.pane,
    },
    segmentActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    segmentText: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: colors.primary,
    },
    markAllBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    pressed: {
      opacity: 0.6,
    },
    title: {
      ...typography.heading2,
      flex: 1,
      fontSize: 20,
      textAlign: 'center',
      color: colors.textPrimary,
    },
    scroll: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    permissionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...glass.pane,
    },
    permissionText: {
      ...typography.caption,
      flex: 1,
      fontSize: 13,
      color: colors.textPrimary,
    },
    listCard: {
      ...glass.pane,
      borderRadius: radius.xxl,
      overflow: 'hidden',
      ...shadows.card,
    },
    skeleton: {
      padding: spacing.sm,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    emptyText: {
      ...typography.body,
      textAlign: 'center',
      color: colors.textSecondary,
    },
  });

export default NotificationsScreen;
