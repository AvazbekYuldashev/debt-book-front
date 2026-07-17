import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { formatDateTime } from '../../../shared/lib/money';
import type { NotificationDTO } from '../types/notification';

interface NotificationRowProps {
  notification: NotificationDTO;
  isLast: boolean;
  onPress: (notification: NotificationDTO) => void;
}

/** Bitta bildirishnoma qatori: ikonka, matn, sana va o'qilmaganlik belgisi. Bosiladigan. */
const NotificationRow: React.FC<NotificationRowProps> = ({ notification, isLast, onPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const unread = !notification.read;

  const handlePress = useCallback(() => onPress(notification), [onPress, notification]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        unread && styles.rowUnread,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={notification.message}
    >
      <View style={[styles.iconWrap, { backgroundColor: unread ? colors.primarySoft : colors.surfaceMuted }]}>
        <Ionicons name="swap-horizontal" size={18} color={unread ? colors.primary : colors.textSecondary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.message} numberOfLines={3}>
          {notification.message}
        </Text>
        <Text style={styles.date}>{formatDateTime(notification.createdDate)}</Text>
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowUnread: {
      backgroundColor: colors.surfaceMuted,
    },
    rowPressed: {
      opacity: 0.6,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
    },
    message: {
      ...typography.bodySmall,
      color: colors.textPrimary,
    },
    date: {
      ...typography.caption,
      marginTop: spacing.xxs,
      color: colors.textSecondary,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: spacing.xs,
      backgroundColor: colors.primary,
    },
  });

export default memo(NotificationRow);
