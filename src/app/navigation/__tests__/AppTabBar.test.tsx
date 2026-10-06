import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
import { AppTabBar } from '../BottomTabNavigator';
import { ROUTES } from '../routes';
import { AppThemeProvider } from '../../../shared/theme';
import { useBackground } from '../../../shared/theme/BackgroundProvider';

// Ovoz tugmasi o'z provider'lari va audio modullariga bog'liq - panel
// geometriyasiga aloqasi yo'q.
jest.mock('../../../features/voice/components/VoiceTabButton', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return () => createElement(View, { testID: 'voice-button' });
});

// Stack'lar butun ekranlar daraxtini tortadi - bu yerda faqat panel kerak.
jest.mock('../ProductsStack', () => () => null);
jest.mock('../DebtsStack', () => () => null);
jest.mock('../GapStack', () => () => null);
jest.mock('../ExpensesStack', () => () => null);
jest.mock('../ProfileStack', () => () => null);

jest.mock('../../../shared/theme/BackgroundProvider', () => {
  const actual = jest.requireActual('../../../shared/theme/BackgroundProvider');
  return { ...actual, useBackground: jest.fn(actual.useBackground) };
});

const mockUseBackground = useBackground as jest.MockedFunction<typeof useBackground>;

const setPhoto = (imageId: string) => {
  const actual = jest.requireActual('../../../shared/theme/BackgroundProvider');
  mockUseBackground.mockImplementation(() => ({
    ...actual.useBackground(),
    imageId,
    fit: 'cover',
    dim: 0.4,
  }));
};

const INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

const routes = [ROUTES.DEBTS, ROUTES.GAP, ROUTES.EXPENSES, ROUTES.PROFILE].map((name) => ({
  key: `${name}-key`,
  name,
}));

const show = (onHeight = jest.fn()) => {
  const props = {
    state: { index: 0, routes, key: 'tabs', routeNames: routes.map((r) => r.name), type: 'tab', stale: false, history: [] },
    navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() },
    descriptors: {},
    insets: INSETS,
    labelOf: (name: string) => name,
  } as any;
  render(
    <AppThemeProvider>
      <SafeAreaInsetsContext.Provider value={INSETS}>
        <BottomTabBarHeightCallbackContext.Provider value={onHeight}>
          <AppTabBar {...props} />
        </BottomTabBarHeightCallbackContext.Provider>
      </SafeAreaInsetsContext.Provider>
    </AppThemeProvider>,
  );
  return onHeight;
};

const settle = () => act(async () => { await Promise.resolve(); });

/** Panel ildizi - onLayout shu yerda. */
const barRoot = () => {
  let node = screen.getByLabelText(ROUTES.DEBTS).parent;
  while (node && !node.props.onLayout) node = node.parent;
  if (!node) throw new Error('panel ildizi topilmadi');
  return node;
};

const layout = (y: number, height: number) =>
  fireEvent(barRoot(), 'layout', { nativeEvent: { layout: { x: 0, y, width: 400, height } } });

const photoNode = () =>
  screen.UNSAFE_root.findAll((node) => node.props.uri !== undefined && node.props.blur !== undefined)[0];

describe('AppTabBar', () => {
  afterEach(() => mockUseBackground.mockReset());

  it("haqiqiy balandligini navigatorga aytadi (sahnalar rasm qutisini shundan oladi)", async () => {
    setPhoto('');
    const onHeight = show();
    await settle();

    layout(790, 70);

    expect(onHeight).toHaveBeenCalledWith(70);
  });

  it("rasmsiz: sirt panelning o'zida, tepada ingichka chiziq", async () => {
    setPhoto('');
    show();
    await settle();

    const style = StyleSheet.flatten(barRoot().props.style);
    expect(style.backgroundColor).toBeTruthy();
    expect(style.borderTopWidth).toBe(StyleSheet.hairlineWidth);
    expect(style.borderTopColor).toBeTruthy();
    expect(photoNode()).toBeUndefined();
  });

  it("rasm bilan: ildiz fonsiz, rasm bo'lagi sahna qutisi bilan bir xil balandlikda", async () => {
    setPhoto('photo-1');
    show();
    await settle();

    const root = StyleSheet.flatten(barRoot().props.style);
    expect(root.backgroundColor).toBeUndefined();
    expect(root.borderTopWidth).toBe(StyleSheet.hairlineWidth);

    layout(790, 70);

    // Quti panel pastiga bog'langan va ramka tepasigacha (790 + 70) - sahnadagi
    // `top: 0, bottom: -panel` qutisi bilan aynan bir xil.
    const photo = photoNode();
    expect(photo).toBeDefined();
    expect(StyleSheet.flatten(photo.props.style)).toMatchObject({
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 860,
    });
    expect(photo.props.fit).toBe('cover');
    expect(photo.props.blur).toBe(16);
    // Ovoz tugmasi rasm bilan ham chiziladi.
    expect(screen.getByTestId('voice-button')).toBeTruthy();
  });
});
