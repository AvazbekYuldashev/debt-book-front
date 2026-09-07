import React, { memo } from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';

export type CardVariant = 'primary' | 'secondary' | 'outline';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}

/**
 * Ilovaning asosiy bloki — yarim shaffof "shisha" sirt.
 *
 * Fon rangi va soyasi `theme.glass` dan keladi: retsept bitta joyda tursin,
 * aks holda har bir ekran o'z alfasini tanlab, kartalar bir-biridan farq
 * qilib ketardi.
 */
const Card: React.FC<CardProps> = ({ children, style, variant = 'primary', ...props }) => {
  const { spacing, glass, colors } = useAppTheme();

  const variantStyle: ViewStyle = variant === 'secondary'
    ? glass.muted
    : variant === 'outline'
      // 'outline' da chegara KO'RINADIGAN bo'lishi kerak — shisha qirrasi
      // o'rniga aniq kontur beriladi.
      ? { ...glass.surface, borderColor: colors.outline }
      : glass.surface;

  return (
    <View
      style={[
        {
          borderRadius: 16,
          padding: spacing.md,
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

export default memo(Card);
