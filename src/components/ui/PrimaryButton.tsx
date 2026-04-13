import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Button, { ButtonVariant } from '../atoms/Button';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  onHapticFeedback?: () => void;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  onHapticFeedback,
}) => {
  return (
    <Button
      title={title}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      variant={variant}
      style={style}
      onHapticFeedback={onHapticFeedback}
    />
  );
};

export default PrimaryButton;
