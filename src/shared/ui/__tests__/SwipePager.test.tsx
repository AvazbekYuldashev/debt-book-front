import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { act, render } from '@testing-library/react-native';
import SwipePager, { type SwipePage } from '../SwipePager';
import { AppThemeProvider } from '../../theme';

/**
 * Sahifa balandligi CHEGARALANGAN bo'lishi kerak.
 *
 * HAQIQIY NOSOZLIK: gorizontal ScrollView ichidagi sahifa faqat en bo'yicha
 * chegaralangan edi. Ichkaridagi ro'yxat `flex: 1` bilan butun uzunligiga
 * yoyilib, o'zi surilmasdi — tashqi ScrollView esa gorizontal bo'lgani uchun
 * vertikal surilmasdi. Natijada narxnoma ham, tarix ham ekran chetidan
 * kesilib qolar, skroll umuman ishlamasdi.
 */
const pages: SwipePage[] = [
  {
    key: 'catalog',
    label: 'Mahsulotlar',
    icon: 'pricetags-outline',
    render: () => (
      <View testID="page-body">
        <Text>narxnoma</Text>
      </View>
    ),
  },
  { key: 'history', label: 'Tarix', icon: 'time-outline', render: () => <Text>tarix</Text> },
];

const renderPager = () =>
  render(
    <AppThemeProvider>
      <SwipePager pages={pages} />
    </AppThemeProvider>,
  );

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as object[]));

/**
 * Sahifa o'ramini EN bo'yicha topamiz: pager ichida eni belgilangan yagona
 * qatlam shu. testID qo'yish uchun ishlab chiqarish kodini o'zgartirish
 * kerak bo'lardi.
 */
const panes = (screen: ReturnType<typeof renderPager>) =>
  screen
    .UNSAFE_getAllByType(View)
    .map((node) => flatten(node.props.style))
    .filter((style) => typeof style.width === 'number');

const layout = (screen: ReturnType<typeof renderPager>, height: number) => {
  act(() => {
    screen.UNSAFE_getByType(ScrollView).props.onLayout({
      nativeEvent: { layout: { width: 400, height } },
    });
  });
};

describe('SwipePager', () => {
  it('olchangan balandlikni sahifaga beradi', async () => {
    const screen = renderPager();
    await screen.findByTestId('page-body');

    layout(screen, 640);

    const found = panes(screen);
    expect(found.length).toBeGreaterThan(0);
    for (const style of found) {
      expect(style.height).toBe(640);
    }
  });

  /** O'lchovdan OLDIN balandlik majburlanmaydi — mazmun o'z holicha chiqadi. */
  it('olchovdan oldin balandlik qoyilmaydi', async () => {
    const screen = renderPager();
    await screen.findByTestId('page-body');

    for (const style of panes(screen)) {
      expect(style.height).toBeUndefined();
    }
  });

  /** Nol balandlik o'lchov emas — u sahifani butunlay ko'rinmas qilardi. */
  it('nol balandlik etiborga olinmaydi', async () => {
    const screen = renderPager();
    await screen.findByTestId('page-body');

    layout(screen, 0);

    for (const style of panes(screen)) {
      expect(style.height).toBeUndefined();
    }
  });
});
