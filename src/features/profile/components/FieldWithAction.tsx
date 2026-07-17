import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import Input from '../../../shared/ui/Input';

interface FieldWithActionProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onAction: () => void;
  loading: boolean;
  secureTextEntry?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
}

/**
 * Yozuv maydoni + yonidagi amal tugmasi (saqlash/tasdiqlash). Profil ekranida
 * takrorlanuvchi "input + icon action" naqshini yagona komponentga yig'adi.
 */
const FieldWithAction: React.FC<FieldWithActionProps> = ({
  label,
  value,
  onChangeText,
  iconName,
  onAction,
  loading,
  secureTextEntry,
  autoComplete,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <Input
        label={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoComplete={autoComplete}
        containerStyle={styles.field}
      />
      <Pressable
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        onPress={onAction}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name={iconName} size={18} color={colors.primary} />
        )}
      </Pressable>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    field: {
      flex: 1,
      marginBottom: spacing.xxs + 2,
    },
    action: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    actionPressed: {
      opacity: 0.6,
    },
  });

export default FieldWithAction;
