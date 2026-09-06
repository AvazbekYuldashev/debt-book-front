import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import EntranceView from './EntranceView';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

export type StatusTone = 'error' | 'warning' | 'success' | 'info';

interface StatusBannerProps {
  tone: StatusTone;
  message: string;
  /** "Qayta urinish" kabi harakat (ixtiyoriy). */
  actionLabel?: string;
  onAction?: () => void;
}

const ICON_BY_TONE: Record<StatusTone, keyof typeof Ionicons.glyphMap> = {
  error: 'alert-circle-outline',
  warning: 'cloud-offline-outline',
  success: 'checkmark-circle-outline',
  info: 'information-circle-outline',
};

/**
 * Xato / offline / muvaffaqiyat holatlari uchun YAGONA banner. Har ekranda
 * alohida "xato qutisi" yozilmasin: ranglar, ikonka va joylashuv shu yerda.
 *
 * A11Y: ma'no rangdan tashqari ikonka va matn bilan ham beriladi.
 */
const StatusBanner: React.FC<StatusBannerProps> = ({ tone, message, actionLabel, onAction }) => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Ikonka rangi va MATN rangi ataylab alohida: sariq/amber matn och fonda
  // WCAG AA ni bermaydi, shuning uchun "warning" (oflayn) bannerida matn
  // neytral qora-navy bo'ladi — ikonka esa rangni saqlaydi. Bu ayni paytda
  // oflayn xabarini "subtle" qiladi, xatolik kabi qichqirmaydi.
  const palette: Record<StatusTone, { fg: string; text: string; bg: string }> = {
    error: { fg: colors.negative, text: colors.negative, bg: colors.negativeSoft },
    warning: { fg: colors.warning, text: colors.textPrimary, bg: colors.surfaceMuted },
    success: { fg: colors.positive, text: colors.positive, bg: colors.positiveSoft },
    info: { fg: colors.info, text: colors.info, bg: colors.infoSoft },
  };
  const { fg, text, bg } = palette[tone];

  return (
    <EntranceView duration={200} fromY={-8}>
      <View style={[styles.banner, { backgroundColor: bg }]} accessibilityRole="alert">
        <Ionicons name={ICON_BY_TONE[tone]} size={iconSize.md} color={fg} />
        <Text style={[styles.message, { color: text }]} numberOfLines={3}>
          {message}
        </Text>
        {actionLabel && onAction ? (
          <PressableScale
            style={[styles.action, { borderColor: text }]}
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={[styles.actionText, { color: text }]} numberOfLines={1}>
              {actionLabel}
            </Text>
          </PressableScale>
        ) : null}
      </View>
    </EntranceView>
  );
};

const createStyles = ({ spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 48,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: radius.lg,
    },
    message: {
      ...typography.bodySmall,
      fontWeight: '600',
      flex: 1,
      minWidth: 0,
    },
    action: {
      minHeight: 32,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    actionText: {
      ...typography.caption,
      fontWeight: '800',
    },
  });

export default memo(StatusBanner);
