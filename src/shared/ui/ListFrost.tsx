import React, { useCallback, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
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
 * YECHIM: muzlatish butun karta ortida bitta qatlam - u ro'yxat
 * sarlavhasida (nol balandlikda) turadi, shuning uchun qatorlardan OLDIN
 * chiziladi va ular bilan birga aylanadi. Qatorlar faqat o'z tusini
 * (yarim shaffof rang) beradi. Balandlik - kontent o'lchamidan pastki
 * bo'shliqni ayirib.
 *
 * Muzlatish yo'q joyda (telefon, rasmsiz fon, "Yo'q" darajasi) hech narsa
 * chizilmaydi.
 *
 * @param rowCount qatorlar soni - bo'sh ro'yxatda o'z kartasi bor.
 * @param bottomInset kontent konteynerining pastki bo'shlig'i (FAB uchun).
 */
export function useListFrost(rowCount: number, bottomInset: number) {
  const { glass, radius, spacing } = useAppTheme();
  const [contentHeight, setContentHeight] = useState(0);

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    setContentHeight(height);
  }, []);

  const height = Math.max(0, contentHeight - bottomInset);
  const active = rowCount > 0 && height > 0 && Object.keys(glass.frost).length > 0;

  const layer: ViewStyle = {
    left: spacing.md,
    right: spacing.md,
    height,
    borderRadius: radius.xxl,
  };

  const ListHeaderComponent = active ? (
    <View style={styles.anchor} pointerEvents="none">
      <View style={[styles.layer, glass.frost, layer]} />
    </View>
  ) : null;

  return { ListHeaderComponent, onContentSizeChange };
}

const styles = StyleSheet.create({
  // Nol balandlik: qatorlar avvalgidek kontentning eng tepasidan boshlanadi.
  anchor: {
    height: 0,
    overflow: 'visible',
  },
  layer: {
    position: 'absolute',
    top: 0,
  },
});
