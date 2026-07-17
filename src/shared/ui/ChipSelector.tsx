import React, { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

/**
 * fluid — chiplar qatorni teng bo'lib to'ldiradi (segmented ko'rinish);
 * wrap — kontentga qarab keyingi qatorga o'tadi;
 * scroll — bitta gorizontal aylanadigan qator (uzun ro'yxatlar uchun).
 */
export type ChipLayout = 'fluid' | 'wrap' | 'scroll';

interface ChipSelectorProps<T extends string> {
  options: ReadonlyArray<ChipOption<T>>;
  value: T | null;
  onChange: (next: T) => void;
  label?: string;
  layout?: ChipLayout;
  style?: StyleProp<ViewStyle>;
}

/** Bitta qiymat tanlanadigan chip guruhi — radio semantikasi bilan. */
function ChipSelector<T extends string>({
  options,
  value,
  onChange,
  label,
  layout = 'wrap',
  style,
}: ChipSelectorProps<T>) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        style={({ pressed }) => [
          styles.chip,
          layout === 'fluid' && styles.chipFluid,
          selected && styles.chipSelected,
          pressed && styles.chipPressed,
        ]}
        accessibilityRole="radio"
        accessibilityLabel={option.label}
        accessibilityState={{ checked: selected }}
        hitSlop={4}
      >
        <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
          {option.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View style={style} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {layout === 'scroll' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
          {chips}
        </ScrollView>
      ) : (
        <View style={[styles.row, layout === 'wrap' && styles.rowWrap]}>{chips}</View>
      )}
    </View>
  );
}

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    label: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.xxs,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    rowWrap: {
      flexWrap: 'wrap',
    },
    rowScroll: {
      gap: spacing.xs,
      paddingBottom: spacing.xxs,
    },
    chip: {
      minHeight: 36,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
    },
    chipFluid: {
      flex: 1,
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    chipPressed: {
      opacity: 0.7,
    },
    chipText: {
      ...typography.label,
      color: colors.textPrimary,
    },
    chipTextSelected: {
      color: colors.primary,
    },
  });

// memo generikni yo'qotmasligi uchun typeof-cast (standart RN/TS usuli).
export default memo(ChipSelector) as typeof ChipSelector;
