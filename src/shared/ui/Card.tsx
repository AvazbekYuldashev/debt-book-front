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
 * Bir muddat u TEKIS (to'ldirilgan) edi. Yomon chiqdi: bezakli fon
 * kartalar ostida butunlay yo'qolar, ekran esa fon ustidagi oq
 * to'rtburchaklar to'plamiga aylanardi. Shaffof sirtda fon ular
 * ORASIDAN ham, OSTIDAN ham xira o'tib turadi va ekran yagona
 * kompozitsiya bo'lib qoladi.
 *
 * Fon RASMI qo'yilganda sirt o'zi quyuqlashadi (`glassSurfaceOnPhoto`),
 * ya'ni fotosurat ustida matn baribir o'qiladi - buning uchun alohida
 * tekis variant kerak emas.
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
      ? { ...glass.surface, borderColor: colors.outline }
      : glass.surface;

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
