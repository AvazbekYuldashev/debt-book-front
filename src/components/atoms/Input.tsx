import React, { memo, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
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
  secureTextEntry,
  ...props
}) => {
  const { colors, spacing, typography } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const backgroundColor = variant === 'secondary' ? colors.gray100 : colors.gray50;
  const borderColor = error ? colors.danger : isFocused ? colors.primary : 'transparent';
  const hasPasswordToggle = Boolean(secureTextEntry);

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
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            typography.BodyRegular,
            {
              borderColor,
              borderRadius: 12,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              paddingRight: hasPasswordToggle ? 76 : spacing.md,
              backgroundColor,
              color: colors.textPrimary,
            },
            style,
          ]}
          placeholderTextColor={colors.textSecondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={hasPasswordToggle ? !isPasswordVisible : undefined}
          {...props}
        />
        {hasPasswordToggle ? (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsPasswordVisible((prev) => !prev)}
          >
            <Text style={[typography.Caption, { color: colors.primary }]}>
              {isPasswordVisible ? 'Yashir' : "Ko'rsat"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
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
  inputContainer: {
    position: 'relative',
  },
  toggleButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});

export default memo(Input);
