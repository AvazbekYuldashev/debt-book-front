import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { FOCUS_INSET } from '../../../shared/ui/focusRing';

interface StatsBannerProps {
  onPress: () => void;
}

/**
 * Ro'yxat OSTIDAGI xulosa banneri — "batafsil raqamlar u yerda".
 *
 * Ro'yxatning oxiri ataylab: odam kontaktlarni ko'rib bo'lgach "umumiy
 * manzara qanday" deb qiziqadi. Tepaga qo'yilsa u balans kartasi bilan
 * raqobatlashardi — ikkalasi ham "umumiy holat" haqida.
 */
const StatsBanner: React.FC<StatsBannerProps> = ({ onPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('debts.statsTitle')}
      dataSet={FOCUS_INSET}
    >
      <View style={styles.icon}>
        <Ionicons name="stats-chart" size={20} color={colors.primary} />
      </View>

      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {t('debts.statsTitle')}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {t('debts.statsSubtitle')}
        </Text>
      </View>

      <View style={styles.action}>
        <Text style={styles.actionText} numberOfLines={1}>
          {t('debts.statsAction')}
        </Text>
        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
      </View>
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass, shadows }: ThemeValue) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.sm,
      borderRadius: radius.xxl,
      ...glass.pane,
      ...shadows.card,
    },
    pressed: {
      opacity: 0.75,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    text: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    title: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    actionText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
  });

export default memo(StatsBanner);
