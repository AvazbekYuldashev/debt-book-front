import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';
import type { DebtsScreenProps } from '../navigation/types';
import { ROUTES } from '../navigation/routes';
import { SkeletonCardList } from '../components/ui/SkeletonShimmer';
import FadeInView from '../components/animations/FadeInView';
import { useNotifications, useMarkNotificationRead } from '../hooks/useNotifications';
import { ContactsContext } from '../context/ContactsContext';
import { normalizePhone } from '../utils/phone';
import {
  getNotificationPermissionAsync,
  openNotificationSettings,
  requestNotificationPermission,
  showDeviceNotification,
  type NotifyPermission,
} from '../utils/deviceNotifications';
import type { NotificationDTO } from '../types/notification';
import NotificationRow from './notifications/NotificationRow';

type Props = DebtsScreenProps<typeof ROUTES.NOTIFICATIONS>;

const ROW_STAGGER_MS = 45;
const ROW_STAGGER_CAP_MS = 360;

const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data, isLoading, isRefetching, refetch } = useNotifications();
  const { mutate: markReadMutate } = useMarkNotificationRead();
  const { contacts } = useContext(ContactsContext);

  const items = data?.content ?? [];
  const isEmpty = items.length === 0;

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
      const actorPhone = notification.actorPhone ? normalizePhone(notification.actorPhone) : '';
      if (!actorPhone) return;
      const contact = contacts.find((item) => item.phone && normalizePhone(item.phone) === actorPhone);
      if (contact) {
        navigation.navigate(ROUTES.CONTACT_DETAIL, { id: contact.id });
      }
    },
    [markReadMutate, contacts, navigation],
  );

  return (
    <View style={styles.container}>
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
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
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

        <View style={styles.listCard}>
          {isLoading ? (
            <SkeletonCardList count={5} containerStyle={styles.skeleton} />
          ) : isEmpty ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-outline" size={26} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
            </View>
          ) : (
            items.map((item, index) => (
              <FadeInView
                key={item.id}
                delay={Math.min(index * ROW_STAGGER_MS, ROW_STAGGER_CAP_MS)}
                duration={300}
                fromY={10}
              >
                <NotificationRow
                  notification={item}
                  isLast={index === items.length - 1}
                  onPress={handlePress}
                />
              </FadeInView>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
    },
    content: {
      padding: spacing.md,
    },
    permissionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    permissionText: {
      ...typography.caption,
      flex: 1,
      fontSize: 13,
      color: colors.textPrimary,
    },
    listCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      paddingVertical: spacing.xxs,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
      overflow: 'hidden',
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
