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
import { useAppTheme } from '../theme';
import { useI18n } from '../i18n';
import VoiceMicButton, { VoiceMicButtonProps } from '../../features/voice/components/VoiceMicButton';

export type InputVariant = 'primary' | 'secondary' | 'outline';

export interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  variant?: InputVariant;
  /**
   * Ovoz bilan to'ldirish.
   *
   * Tugma maydonning ICHIGA emas, sarlavha qatorining o'ng chetiga qo'yiladi.
   * Ichkarida bo'lsa uzun matnni yozayotganda kursor ostida qolardi, va
   * parol ko'rsatish tugmasi bilan bir joyni talashardi.
   */
  voice?: Omit<VoiceMicButtonProps, 'onError'>;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  style,
  containerStyle,
  variant = 'primary',
  secureTextEntry,
  value,
  voice,
  ...props
}) => {
  const { colors, spacing, typography } = useAppTheme();
  const { t } = useI18n();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

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
      {/* Tugma bo'lmasa balandlik oshmaydi: ilovadagi qolgan barcha
          maydonlar avvalgidek ko'rinishi kerak. */}
      <View style={[styles.labelRow, voice && styles.labelRowWithVoice, { marginBottom: spacing.xs }]}>
        <Text style={[typography.label, { color: colors.textPrimary }]}>{label}</Text>
        {voice ? <VoiceMicButton {...voice} onError={setVoiceError} /> : null}
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            typography.body,
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
          value={value === undefined ? undefined : (value ?? '')}
        />
        {hasPasswordToggle ? (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsPasswordVisible((prev) => !prev)}
          >
            <Text style={[typography.caption, { color: colors.primary }]}>
              {isPasswordVisible ? t('common.hide') : t('common.show')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error || voiceError ? (
        <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>
          {error ?? voiceError}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {},
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Mikrofon tugmasi 28px — sarlavha qatori undan past bo'lmasin.
  labelRowWithVoice: {
    minHeight: 28,
  },
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
