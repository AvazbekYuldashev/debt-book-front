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
  /**
   * `soft`  — pastel yashil fon, yashil matn: ikkinchi darajali amal.
   * `solid` — to'q yashil fon, oq matn: bo'limning ASOSIY amali
   *           (masalan "Yangi qo'shish" — foydalanuvchi eng ko'p bosadigan tugma).
   */
  actionVariant?: 'soft' | 'solid';
  /**
   * Ikonka pastel doiracha ichidami (`true`) yoki sarlavha yonida ochiq
   * turadimi (`false`). Ochiq variant sarlavhani kuchliroq qiladi — bo'lim
   * bitta bo'lsa doiracha ortiqcha bezak bo'lib qoladi.
   */
  iconBadge?: boolean;
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
  actionVariant = 'soft',
  iconBadge = true,
}) => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isSolid = actionVariant === 'solid';
  const actionTint = isSolid ? colors.textOnPrimary : colors.primary;

  return (
    <View style={styles.row}>
      {/* Yorliq O'Z SIRTIDA, tabletka ichida.
          Bo'lim sarlavhasi ekranning o'rtasida, kartalardan tashqarida
          turadi va fon rasmi to'q bo'lsa yorug' mavzudagi to'q matn
          unga qo'shilib ketardi. Kontur yetarli emasdi: ingichka oq
          chiziq to'q fonda to'q matnni qutqarmaydi. Tabletka esa
          matnga o'z foni beradi - rasm qanday bo'lishidan qat'i nazar
          o'qiladi. */}
      <View style={styles.left}>
        {iconBadge ? (
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={iconSize.sm} color={colors.primary} />
          </View>
        ) : (
          <Ionicons name={icon} size={iconSize.md} color={colors.textPrimary} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {actionLabel && onAction ? (
        <PressableScale
          style={[styles.action, isSolid && styles.actionSolid]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Ionicons name={actionIcon} size={iconSize.sm} color={actionTint} />
          <Text style={[styles.actionText, { color: actionTint }]} numberOfLines={1}>
            {actionLabel}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.xs,
    },
    /**
     * Yorliq tabletkasi: matnga O'Z foni.
     *
     * Kengligi mazmunga qarab (`alignSelf: flex-start`) - butun qator
     * bo'ylab cho'zilsa, u sarlavha emas, bo'sh panel bo'lib ko'rinardi.
     */
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xs,
      paddingVertical: spacing.xxs,
      paddingRight: spacing.sm,
      paddingLeft: spacing.xxs,
      borderRadius: radius.pill,
      ...glass.surface,
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
      minHeight: 44,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
    },
    actionSolid: {
      backgroundColor: colors.primary,
      ...shadows.card,
    },
    actionText: {
      ...typography.label,
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
    },
  });

export default memo(SectionHeader);
