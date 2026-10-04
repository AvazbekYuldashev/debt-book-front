import React, { memo } from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';

export type CardVariant = 'primary' | 'secondary' | 'outline';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}

/**
 * Ilovaning asosiy bloki — TEKIS, to'ldirilgan sirt.
 *
 * Ilgari u yarim shaffof "shisha" edi va ilovaning o'z bezakli foni
 * ustida chiroyli ko'rinardi. Foydalanuvchi fon RASMI qo'yganda esa
 * rasm naqshlari karta ichidagi matn bilan aralashib, mazmunni o'qish
 * qiyinlashardi. To'ldirilgan sirtda mazmun oldinga chiqadi, fon esa
 * kartalar ORASIDA o'z holicha ko'rinadi.
 *
 * `secondary` SHAFFOF qoladi: u karta ICHIDAGI bo'lak (chip, ajratilgan
 * maydon) va ota-karta allaqachon to'ldirilgan - ikkinchi qatlam
 * ortiqcha og'irlik berardi.
 *
 * Retsept `theme.glass` da, bitta joyda: aks holda har ekran o'z
 * alfasini tanlab, kartalar bir-biridan farq qilib ketardi.
 */
const Card: React.FC<CardProps> = ({ children, style, variant = 'primary', ...props }) => {
  const { spacing, glass, colors } = useAppTheme();

  const variantStyle: ViewStyle = variant === 'secondary'
    ? glass.muted
    : variant === 'outline'
      // 'outline' da chegara KO'RINADIGAN bo'lishi kerak — shisha qirrasi
      // o'rniga aniq kontur beriladi.
      ? { ...glass.flat, borderColor: colors.outline }
      : glass.flat;

  return (
    <View
      style={[
        {
          // Burchak yumshoqroq: to'ldirilgan katta sirtda 16 qirrali
          // ko'rinardi, 20 esa blokni yengillashtiradi.
          borderRadius: 20,
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
