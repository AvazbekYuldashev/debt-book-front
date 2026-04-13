import React, { memo, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '../../theme';

export type InputVariant = 'primary' | 'secondary' | 'outline';

export interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  variant?: InputVariant;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  style,
  containerStyle,
  variant = 'primary',
  ...props
}) => {
  const { colors, spacing, typography } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);

  const backgroundColor = variant === 'secondary' ? colors.gray100 : colors.gray50;
  const borderColor = error ? colors.danger : isFocused ? colors.primary : 'transparent';

  const handleFocus: TextInputProps['onFocus'] = (event) => {
    setIsFocused(true);
    props.onFocus?.(event);
  };

  const handleBlur: TextInputProps['onBlur'] = (event) => {
    setIsFocused(false);
    props.onBlur?.(event);
  };

  return (
    <View style={[styles.wrapper, { marginBottom: spacing.md }, containerStyle]}>
      <Text style={[typography.label, { color: colors.textPrimary, marginBottom: spacing.xs }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          typography.BodyRegular,
          {
            borderColor,
            borderRadius: 12,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            backgroundColor,
            color: colors.textPrimary,
          },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      {error ? (
        <Text style={[typography.Caption, { color: colors.danger, marginTop: spacing.xs }]}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {},
  input: {
    borderWidth: 1.5,
  },
});

export default memo(Input);
