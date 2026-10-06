import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** Qo'shimcha izoh (ixtiyoriy) — nima qilish kerakligini tushuntiradi. */
  description?: string;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  /**
   * O'z kartasida chizilsin. Bo'sh holat ko'pincha kartadan TASHQARIDA,
   * to'g'ridan-to'g'ri fonda turadi - fon rasmi qo'yilganda sarlavha va
   * izoh unga qo'shilib ketardi. Allaqachon karta ichida turgan joylarda
   * (masalan, Qarzlar ro'yxatining emptyCard'i) kerak emas.
   */
  card?: boolean;
}

/**
 * Bo'sh holat: pastel doiradagi ikonka, sarlavha, izoh va (ixtiyoriy) CTA.
 * Ro'yxat bo'sh bo'lganda "boshi berk ko'cha" hissi bo'lmasligi uchun CTA
 * berish tavsiya etiladi.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  actionIcon = 'add',
  onAction,
  card = false,
}) => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.wrap, card && styles.card]}>
      <View style={styles.iconOuter}>
        <View style={styles.iconInner}>
          <Ionicons name={icon} size={iconSize.xl} color={colors.primary} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}

      {actionLabel && onAction ? (
        <PressableScale
          style={styles.action}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Ionicons name={actionIcon} size={iconSize.sm} color={colors.textOnPrimary} />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    card: {
      ...glass.surface,
      borderRadius: radius.xxl,
      marginHorizontal: spacing.md,
    },
    // Ikki qavatli doira — "yumshoq nur" ta'siri, og'ir soyasiz.
    iconOuter: {
      width: 96,
      height: 96,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
      opacity: 0.7,
    },
    iconInner: {
      width: 64,
      height: 64,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      ...glass.muted,
    },
    title: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    description: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xs,
      maxWidth: 300,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      minHeight: 44,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      ...shadows.floating,
    },
    actionText: {
      ...typography.button,
      color: colors.textOnPrimary,
    },
  });

export default memo(EmptyState);
