import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import BackButton from './BackButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  /** O'ngda qo'shimcha amal (masalan "qo'shish" tugmasi). */
  right?: React.ReactNode;
}

/**
 * Butun ilova bo'yicha izchil ekran headeri: orqaga tugmasi + sarlavha (+ ixtiyoriy
 * subtitle va o'ng tomondagi amal). Native-stack'ning standart headeri o'rniga
 * ishlatiladi (screen options'da `headerShown: false` bilan birga).
 */
const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, onBack, right }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <BackButton onPress={onBack} />
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
      backgroundColor: colors.background,
    },
    titleWrap: {
      flex: 1,
    },
    title: {
      ...typography.heading2,
      fontSize: 19,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      marginTop: 1,
      color: colors.textSecondary,
    },
  });

export default ScreenHeader;
