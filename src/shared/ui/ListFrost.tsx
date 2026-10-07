import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../theme';

/**
 * Qatorlardan yig'ilgan ro'yxat kartasi uchun BITTA muzli shisha qatlami.
 *
 * MUAMMO: ro'yxat kartasi qatorlarning o'zidan yig'iladi (birinchi qator
 * tepasi, oxirgisi pasti yumaloq). Har qator o'zi muzlatsa, brauzer har
 * birining ortini FAQAT o'z chegarasi ichida xiralashtiradi - qo'shni
 * qatorlar chegarada bir-biriga mos kelmaydi va karta "zinapoya" bo'lib
 * chiqadi: har qator o'z yorug'-to'q gradienti bilan, oralarida keskin
 * chok. Shaffof darajalarda ("O'rta", "Ko'p") bu yaqqol ko'rinardi.
 *
 * YECHIM: muzlatish butun karta ortida bitta qatlam. U ro'yxat
 * sarlavhasida (nol balandlikda) turadi, shuning uchun qatorlardan OLDIN
 * chiziladi va ular bilan birga aylanadi. Qatorlar faqat o'z rangini
 * (tus + oq xiralik) beradi.
 *
 * O'LCHAM CSS'DAN, o'lchovsiz: sarlavha o'rami va langar `static`, shuning
 * uchun qatlamning `absolute` asosi - kontent konteynerining o'zi
 * (padding'i bilan). `top: 0` birinchi qator tepasi, `bottom: bottomInset`
 * esa oxirgi qator pasti. Qatlam qatorlar bilan BIR joylashuv o'tishida
 * hisoblanadi: qidiruv natijasi o'zgarganda kech qolmaydi, ekran
 * yashirilib qaytganda (display:none) yo'qolmaydi, aylantirishda ekran
 * qayta chizilmaydi.
 *
 * Muzlatish yo'q joyda (telefon, rasmsiz fon, "Yo'q" darajasi) hech narsa
 * chizilmaydi.
 *
 * @param rowCount qatorlar soni - bo'sh ro'yxatda o'z kartasi bor.
 * @param bottomInset kontent konteynerining pastki bo'shlig'i (FAB uchun).
 * @returns FlatList'ga yoyiladigan ikki prop.
 */
export function useListFrost(rowCount: number, bottomInset: number) {
  const { glass, radius, spacing } = useAppTheme();
  const active = rowCount > 0 && Object.keys(glass.frost).length > 0;

  const ListHeaderComponent = active ? (
    <View style={styles.anchor} pointerEvents="none">
      <View
        style={[
          styles.layer,
          glass.frost,
          {
            left: spacing.md,
            right: spacing.md,
            bottom: bottomInset,
            borderRadius: radius.xxl,
          },
        ]}
      />
    </View>
  ) : null;

  return { ListHeaderComponent, ListHeaderComponentStyle: active ? styles.static : undefined };
}

const styles = StyleSheet.create({
  // Sarlavha o'rami: joylashuvga asos bo'lmasin - asos kontent konteyneri.
  static: {
    position: 'static',
  },
  // Nol balandlik: qatorlar avvalgidek kontentning eng tepasidan boshlanadi.
  anchor: {
    position: 'static',
    height: 0,
  },
  layer: {
    position: 'absolute',
    top: 0,
  },
});
