import React, { memo } from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme';

export type CardVariant = 'primary' | 'secondary' | 'outline';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}

const Card: React.FC<CardProps> = ({ children, style, variant = 'primary', ...props }) => {
  const { colors, spacing, radius } = useAppTheme();

  const variantStyle: ViewStyle = variant === 'secondary'
    ? { backgroundColor: colors.gray50, borderWidth: 0 }
    : variant === 'outline'
      ? { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.outline }
      : { backgroundColor: '#FFFFFF', borderWidth: 0 };

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: 16,
          padding: spacing.md,
          shadowColor: '#000',
        },
        variantStyle,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
});

export default memo(Card);
