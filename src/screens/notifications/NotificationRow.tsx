import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { formatDateTime } from '../../utils/money';
import type { NotificationDTO } from '../../types/notification';

interface NotificationRowProps {
  notification: NotificationDTO;
  isLast: boolean;
}

/** Bitta bildirishnoma qatori: ikonka, matn, sana va o'qilmaganlik belgisi. */
const NotificationRow: React.FC<NotificationRowProps> = ({ notification, isLast }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const unread = !notification.read;

  return (
    <View style={[styles.row, !isLast && styles.rowBorder, unread && styles.rowUnread]}>
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
    </View>
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
