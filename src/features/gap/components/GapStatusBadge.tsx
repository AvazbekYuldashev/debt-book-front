import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';

export type GapBadgeTone = 'neutral' | 'active' | 'success' | 'warning' | 'danger';

interface GapStatusBadgeProps {
  label: string;
  tone?: GapBadgeTone;
}

/**
 * Kichik holat yorlig'i (guruh / davr / badal holati uchun).
 *
 * Rang MA'NOGA bog'lanadi, brend rangiga emas: "kutilmoqda" sariq,
 * "tasdiqlangan" yashil, "kechikkan" qizil. Foydalanuvchi holatni matnni
 * o'qimasdan ham ajrata olishi kerak.
 */
const GapStatusBadge: React.FC<GapStatusBadgeProps> = ({ label, tone = 'neutral' }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme;

  const palette: Record<GapBadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
    active: { bg: colors.primarySoft, fg: colors.primaryPressed },
    success: { bg: colors.positiveSoft, fg: colors.positive },
    warning: { bg: colors.dangerMuted, fg: colors.warning },
    danger: { bg: colors.negativeSoft, fg: colors.negative },
  };
  const { bg, fg } = palette[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const createStyles = ({ spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.xs,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    text: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
    },
  });

export default GapStatusBadge;
