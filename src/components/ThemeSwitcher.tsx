import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { useI18n } from '../i18n';

type ThemeMode = 'light' | 'dark' | 'system';

interface Props {
  style?: ViewStyle;
}

const OPTIONS: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { mode: 'light', icon: 'sunny-outline', labelKey: 'profile.themeLight' },
  { mode: 'dark', icon: 'moon-outline', labelKey: 'profile.themeDark' },
  { mode: 'system', icon: 'phone-portrait-outline', labelKey: 'profile.themeSystem' },
];

const ThemeSwitcher: React.FC<Props> = ({ style }) => {
  const { mode, setMode, colors, radius, spacing } = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors, radius, spacing), [colors, radius, spacing]);

  return (
    <View style={[styles.wrap, style]}>
      {OPTIONS.map((opt) => {
        const active = mode === opt.mode;
        return (
          <TouchableOpacity
            key={opt.mode}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => setMode(opt.mode)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={opt.icon}
              size={18}
              color={active ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{t(opt.labelKey)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

type C = ReturnType<typeof useAppTheme>['colors'];
type R = ReturnType<typeof useAppTheme>['radius'];
type S = ReturnType<typeof useAppTheme>['spacing'];

const createStyles = (colors: C, radius: R, spacing: S) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    option: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    labelActive: {
      color: colors.primary,
    },
  });

export default ThemeSwitcher;
