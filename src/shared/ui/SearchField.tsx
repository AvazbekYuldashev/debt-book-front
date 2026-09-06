import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

interface SearchFieldProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (value: string) => void;
  /** Skrinrider uchun maydon nomi (ko'rinadigan label yo'q — joy tejaladi). */
  accessibilityLabel: string;
}

/**
 * Qidiruv maydoni: oq karta, boshida qidiruv ikonkasi, oxirida "tozalash"
 * tugmasi (faqat matn bo'lsa). `Input` dan farqi — ko'rinadigan label yo'q
 * va shakli "pill": sarlavha ostida bitta qator sifatida yashaydi.
 */
const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeText,
  accessibilityLabel,
  ...rest
}) => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <Ionicons name="search-outline" size={iconSize.md} color={colors.textSecondary} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="search"
        {...rest}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('common.clear')}
          style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
        >
          <Ionicons name="close" size={iconSize.xs} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      ...shadows.card,
    },
    input: {
      ...typography.body,
      flex: 1,
      minWidth: 0,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
    },
    clear: {
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    clearPressed: {
      opacity: 0.6,
    },
  });

export default memo(SearchField);
