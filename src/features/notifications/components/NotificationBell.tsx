import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { ROUTES } from '../../../app/navigation/routes';
import type { MainTabNavigation } from '../../../app/navigation/types';
import { primeNotificationAudio } from '../../../shared/lib/webNotify';
import { requestNotificationPermission } from '../../../shared/lib/deviceNotifications';
import { useUnreadNotificationCount } from '../hooks/useNotifications';

/**
 * Bildirishnoma tugmasi — BARCHA bosh ekranlarda bir xil joyda (sarlavha
 * qatorining o'ng chekkasida) turadigan yagona komponent.
 *
 * Ilgari u faqat Qarzlar ekranida bor edi va o'sha yerda joyida yozilgandi:
 * boshqa bo'limlarga o'tgan foydalanuvchi o'qilmagan xabari borligini
 * umuman ko'rmasdi. Endi ro'yxat ham, o'qilmaganlar soni ham bitta joyda.
 *
 * Bildirishnomalar ekrani Qarzlar stack'ida yashaydi, shuning uchun boshqa
 * tablardan tab-lararo navigatsiya bilan ochiladi.
 */
const NotificationBell: React.FC = () => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<MainTabNavigation>();

  const unreadQuery = useUnreadNotificationCount();
  const unreadCount = unreadQuery.data ?? 0;

  const handlePress = useCallback(() => {
    // Foydalanuvchi ishorasi — brauzerning autoplay blokini "ochish" va
    // qurilma ruxsatini so'rash uchun yagona ishonchli payt.
    requestNotificationPermission();
    primeNotificationAudio();
    navigation.navigate(ROUTES.DEBTS, { screen: ROUTES.NOTIFICATIONS });
  }, [navigation]);

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={t('notifications.title')}
    >
      <Ionicons name="notifications-outline" size={iconSize.md} color={colors.textPrimary} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const createStyles = ({ colors, radius, typography, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    // Fon ustida SUZADI, karta ichida emas — shuning uchun shisha sirt.
    button: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      ...glass.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.card,
    },
    pressed: {
      opacity: 0.6,
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 18,
      height: 18,
      borderRadius: radius.pill,
      paddingHorizontal: 4,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '800',
      color: colors.textOnPrimary,
    },
  });

export default memo(NotificationBell);
