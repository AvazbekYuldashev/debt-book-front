import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** O'ngdagi "pill" harakat tugmasi (ixtiyoriy). */
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
}

/**
 * Bo'lim sarlavhasi: chapda ikonka + qalin sarlavha, o'ngda pastel yashil
 * "pill" harakat tugmasi. Barcha ekranlarda bir xil ishlatiladi.
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  actionLabel,
  actionIcon = 'add',
  onAction,
}) => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={iconSize.sm} color={colors.primary} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {actionLabel && onAction ? (
        <PressableScale
          style={styles.action}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Ionicons name={actionIcon} size={iconSize.xs} color={colors.primary} />
          <Text style={styles.actionText} numberOfLines={1}>
            {actionLabel}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      // Sarlavha uzun bo'lsa harakat tugmasini siqib chiqarmasin.
      flexShrink: 1,
      minWidth: 0,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    title: {
      ...typography.heading3,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      minHeight: 36,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
    },
    actionText: {
      ...typography.label,
      fontWeight: '700',
      color: colors.primary,
    },
  });

export default memo(SectionHeader);
