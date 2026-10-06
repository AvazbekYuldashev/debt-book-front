import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';
import { FOCUS_SELF } from './focusRing';

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
  onFocus,
  onBlur,
  ...rest
}) => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  /**
   * Fokus - butun "pill" chegarasi brand rangida, Input bilan bir xil.
   * Web'dagi umumiy halqa matn maydoniga sichqoncha/barmoq bilan
   * bosilganda chizilmaydi, shuning uchun ko'rsatkichni maydon o'zi beradi.
   */
  const [focused, setFocused] = useState(false);
  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (event) => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );
  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (event) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  return (
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <Ionicons name="search-outline" size={iconSize.md} color={colors.textSecondary} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="search"
        dataSet={FOCUS_SELF}
        {...rest}
        onFocus={handleFocus}
        onBlur={handleBlur}
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

const createStyles = ({ colors, spacing, radius, typography, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      ...glass.pane,
      ...shadows.card,
    },
    // Faqat rang almashadi, eni pane'niki (hairline) qoladi: fokusda
    // maydon bir piksel ham siljimaydi.
    wrapFocused: {
      borderColor: colors.primary,
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
