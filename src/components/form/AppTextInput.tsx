import React from 'react';
import { TextInputProps, ViewStyle, StyleProp } from 'react-native';
import Input, { InputVariant } from '../atoms/Input';

interface AppTextInputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  variant?: InputVariant;
}

const AppTextInput: React.FC<AppTextInputProps> = (props) => <Input {...props} />;

export default AppTextInput;
