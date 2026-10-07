import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { NestedGlass, useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

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

  return (
    <View style={[styles.wrap, style]}>
      {/* Sarlavha O'Z SIRTIDA: u panel tashqarisida, fon ustida
          turadi va to'q rasmda yorug' mavzudagi to'q matn yo'qolardi. */}
      {title ? (
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      <View style={styles.panel}>
        <NestedGlass>{children}</NestedGlass>
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      marginBottom: spacing.lg,
    },
    /**
     * Kengligi MAZMUNGA qarab: butun qator bo'ylab cho'zilsa, u
     * sarlavha emas, bo'sh panel bo'lib ko'rinardi.
     */
    titleWrap: {
      alignSelf: 'flex-start',
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      marginBottom: spacing.xs,
      marginLeft: spacing.xxs,
      ...glass.surface,
    },
    title: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textSecondary,
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
