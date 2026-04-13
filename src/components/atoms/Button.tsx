import React, { memo, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  PressableStateCallbackType,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  onHapticFeedback?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  onHapticFeedback,
}) => {
  const { colors, spacing, typography } = useAppTheme();
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;
  const useNativeDriver = Platform.OS !== 'web';

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    onHapticFeedback?.();
    onPress();
  }, [isDisabled, onHapticFeedback, onPress]);

  const animateScale = useCallback((toValue: number) => {
    Animated.spring(scale, {
      toValue,
      speed: 22,
      bounciness: 0,
      useNativeDriver,
    }).start();
  }, [scale, useNativeDriver]);

  const getContainerStyle = useCallback(({ pressed }: PressableStateCallbackType) => {
    const base: ViewStyle = {
      minHeight: 48,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: isDisabled ? 0.6 : pressed ? 0.86 : 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    };

    if (variant === 'secondary') {
      return [
        base,
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.primary,
        },
      ];
    }
    if (variant === 'outline') {
      return [
        base,
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.primary,
        },
      ];
    }

    return [
      base,
      { backgroundColor: pressed ? colors.primaryPressed : colors.primary, borderWidth: 0 },
    ];
  }, [colors, isDisabled, spacing.md, variant]);

  const textColor = variant === 'primary' ? colors.textOnPrimary : colors.primary;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => animateScale(0.95)}
      onPressOut={() => animateScale(1)}
      disabled={isDisabled}
      style={(state) => [getContainerStyle(state), style]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <Text style={[styles.text, typography.button, { color: textColor }]}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
  },
});

export default memo(Button);
