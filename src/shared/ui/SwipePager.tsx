import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLUMN_WIDTH } from './AppFrame';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

export interface SwipePage {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  render: () => React.ReactNode;
}

interface SwipePagerProps {
  pages: SwipePage[];
  style?: StyleProp<ViewStyle>;
  /** Sahifa almashganda — masalan ikkinchi sahifa ma'lumotini kech yuklash uchun. */
  onPageChange?: (index: number) => void;
}

/**
 * Chapdan-o'ngga suriladigan sahifalar — telefon bosh ekrani kabi.
 *
 * `pagingEnabled` ScrollView ustiga qurilgan, qo'shimcha kutubxonasiz:
 * `react-native-pager-view` native modul talab qiladi va web'da ishlamaydi,
 * bu ilova esa Android va web'da BIR XIL ishlashi kerak.
 *
 * Sahifa eni HISOBLANADI, o'lchanmaydi: `min(oyna eni, ilova ustuni eni)`.
 * Bu ilova bitta ustun (AppFrame) — telefonda ustun butun ekran, brauzerda
 * `APP_COLUMN_WIDTH`. Shu sababli bu qiymat aynan bitta sahifa eni.
 *
 * O'lchash ATAYIN ishlatilmagan: bu muhitda (Expo web, RNW 0.21) `onLayout`
 * ham, `onContentSizeChange` ham umuman chaqirilmadi — sahifalar chizilmay,
 * faqat tab sarlavhalari qolgandi. AppFrame izohida ham xuddi shu narsa
 * yozilgan: o'lchov brauzerda kutilgan qiymatni bermagan.
 *
 * Ustidagi segment tugmalari ataylab qo'yilgan: web'da sichqoncha bilan surib
 * bo'lmaydi, shuning uchun har bir sahifaga BOSIB ham o'tish yo'li bor. Ular
 * ayni paytda "qaysi sahifadaman / yana nima bor" ko'rsatkichi ham — aks holda
 * ikkinchi sahifa borligi umuman bilinmasdi.
 */
const SwipePager: React.FC<SwipePagerProps> = ({ pages, style, onPageChange }) => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = Math.min(windowWidth, APP_COLUMN_WIDTH);

  /**
   * SAHIFA BALANDLIGI O'LCHANADI, taxmin qilinmaydi.
   *
   * Gorizontal ScrollView ichidagi bola faqat en bo'yicha chegaralangan
   * edi: balandligi MAZMUNGA qarab cho'zilardi. Shunda ichkaridagi
   * ro'yxat (`flex: 1`) hech qachon chegara olmay, butun uzunligiga
   * yoyilardi - va o'zi ham surilmasdi, tashqi ScrollView esa gorizontal
   * bo'lgani uchun vertikal surilmasdi. Natijada ro'yxat ekran chetidan
   * KESILIB qolar, skroll umuman ishlamasdi.
   *
   * Balandlik berilishi bilan ro'yxat o'z chegarasini biladi va odatdagidek
   * suriladi. Aynan shu yo'l tanlandi, chunki `height: '100%'` web'da
   * ota-onaning balandligi aniq bo'lmasa hisoblanmaydi.
   */
  const [pageHeight, setPageHeight] = useState(0);
  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) setPageHeight(height);
  }, []);

  /**
   * Tugma bilan sahifaga o'tish.
   *
   * `animated: true` react-native-web'da `scroll({behavior:'smooth'})` ga
   * tushadi — u kompozitsiya qilinmayotgan (ko'rinmas) sahifada joyida
   * qotib qoladi. Haqiqiy brauzer oynasida va qurilmada normal ishlaydi,
   * shuning uchun sirpanish saqlab qolindi.
   */
  const goTo = useCallback(
    (next: number) => {
      if (next === index) return;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * pageWidth, y: 0, animated: true });
    },
    [index, pageWidth]
  );

  // Surish tugaganda faol sahifani aniqlaymiz: yarmidan oshgan surilish
  // keyingi sahifaga o'tgan hisoblanadi.
  const onScrollSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth <= 0) return;
      const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      if (next !== index) setIndex(next);
    },
    [index, pageWidth]
  );

  useEffect(() => {
    onPageChange?.(index);
  }, [index, onPageChange]);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.tabs}>
        {pages.map((page, i) => {
          const active = i === index;
          const tint = active ? colors.primary : colors.textSecondary;
          return (
            <Pressable
              key={page.key}
              onPress={() => goTo(i)}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={page.label}
            >
              <View style={styles.tabInner}>
                <Ionicons name={page.icon} size={iconSize.sm} color={tint} />
                <Text style={[styles.tabText, { color: tint }, active && styles.tabTextActive]} numberOfLines={1}>
                  {page.label}
                </Text>
              </View>
              <View
                style={[styles.underline, { backgroundColor: active ? colors.primary : 'transparent' }]}
              />
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollSettled}
        // Web'da momentum hodisasi kelmaydi — barmoq/sichqoncha uzilgani ham hisobga olinadi.
        onScrollEndDrag={onScrollSettled}
        scrollEventThrottle={16}
        onLayout={onViewportLayout}
        style={styles.scroll}
      >
        {pages.map((page) => (
          // Birinchi renderda balandlik hali noma'lum - o'shanda mazmun
          // o'z o'lchamida chiqadi va o'lchovdan keyin joyiga tushadi.
          <View key={page.key} style={{ width: pageWidth, height: pageHeight || undefined }}>
            {page.render()}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    tabs: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingTop: spacing.xxs,
      gap: spacing.xxs + 2,
    },
    tabPressed: {
      opacity: 0.6,
    },
    tabInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs + 2,
    },
    tabText: {
      ...typography.label,
      fontSize: 14,
      fontWeight: '600',
    },
    tabTextActive: {
      fontWeight: '800',
    },
    // Chiziq joyi DOIM band (nofaolda shaffof) — aks holda sahifa
    // almashganda ostidagi ro'yxat ikki piksel sakrardi.
    underline: {
      height: 2,
      width: '55%',
      borderRadius: 1,
    },
  });

export default SwipePager;
