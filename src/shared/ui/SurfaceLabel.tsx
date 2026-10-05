import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

export interface SurfaceLabelProps {
  children: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Fon USTIDA turgan yorliq: matn o'z sirtida.
 *
 * NEGA KERAK: ekrandagi matnning ko'pi kartalar ichida va ular o'z
 * foniga ega. Bo'lim yorliqlari esa kartalardan TASHQARIDA, to'g'ridan
 * to'g'ri fonda turadi - foydalanuvchi to'q rasm qo'yganda yorug'
 * mavzudagi to'q matn unga qo'shilib ketardi.
 *
 * Kontur (matn soyasi) bu holatda yetarli emas: ingichka oq chiziq to'q
 * fonda to'q matnni qutqarmaydi. Sirt esa kafolat beradi - rasm qanday
 * bo'lishidan qat'i nazar matn o'z foni ustida turadi.
 *
 * Kenglik MAZMUNGA qarab (`alignSelf: flex-start`): butun qator bo'ylab
 * cho'zilsa, u yorliq emas, bo'sh panel bo'lib ko'rinardi.
 */
const SurfaceLabel: React.FC<SurfaceLabelProps> = ({ children, style, textStyle }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.pill, style]}>
      <Text style={[styles.text, textStyle]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    pill: {
      alignSelf: 'flex-start',
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      ...glass.surface,
    },
    text: {
      ...typography.label,
      color: colors.textSecondary,
    },
  });

export default memo(SurfaceLabel);
