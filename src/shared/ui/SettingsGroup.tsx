import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { useBackground } from '../theme/BackgroundProvider';
import { photoTextHalo } from '../theme/onPhoto';

export interface SettingsGroupProps {
  /** Guruh ustidagi kichik sarlavha. Bo'lmasa chizilmaydi. */
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sozlamalar guruhi: kichik sarlavha va uning ostidagi yaxlit panel.
 *
 * NEGA GURUH: sozlamalar ro'yxati uzun va bir-biriga aloqasiz
 * bandlardan iborat. Har bandni alohida kartaga solsak, ekran
 * to'rtburchaklar to'plamiga aylanardi; hammasini bitta uzun ro'yxatga
 * tiqsak, qayerda til, qayerda ko'rinish ekani bilinmasdi. Guruh ikkala
 * chetdan qochadi: bog'liq bandlar bitta panelda, panellar orasida esa
 * bo'shliq.
 *
 * Sarlavha panelning USTIDA va kichik - u band emas, yo'l ko'rsatkichi.
 */
const SettingsGroup: React.FC<SettingsGroupProps> = ({ title, children, style }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Sarlavha panel TASHQARISIDA, ya'ni fon rasmi ustida turadi - halo
  // uni har qanday rasmda ajratib beradi.
  const { imageId } = useBackground();
  const halo = useMemo(
    () => photoTextHalo(theme.colors, imageId.length > 0),
    [theme.colors, imageId],
  );

  return (
    <View style={[styles.wrap, style]}>
      {title ? <Text style={[styles.title, halo]}>{title}</Text> : null}
      <View style={styles.panel}>{children}</View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      marginLeft: spacing.sm,
    },
    // Panel ichidagi qatorlar o'z ajratuvchisini chizadi, shuning uchun
    // bu yerda faqat sirt va burchaklar.
    panel: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...glass.surface,
    },
  });

export default memo(SettingsGroup);
