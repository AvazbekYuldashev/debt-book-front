import React from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import RegisterScreen from '../RegisterScreen';

// Ekran o'lchamlari: 812px balandlik, 312px klaviatura (screenY = 500).
const SCREEN_HEIGHT = 812;
const KEYBOARD_TOP = 500;

// Native o'lchash test muhitida bo'sh funksiya — ekranni to'liq egallagan
// konteyner sifatida javob qaytaramiz.
const mockMeasureInWindow = () => jest.spyOn(View.prototype as any, 'measureInWindow')
  .mockImplementation(((cb: (x: number, y: number, w: number, h: number) => void) => cb(0, 0, 375, SCREEN_HEIGHT)) as any);

const renderRegister = () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() } as any;
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <RegisterScreen navigation={navigation} />
      </LanguageProvider>
    </AppThemeProvider>,
  );
  return { navigation };
};

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

describe('RegisterScreen — maydonlar va klaviatura', () => {
  it("barcha to'rt maydonni ko'rsatadi", async () => {
    renderRegister();
    await settle();

    expect(screen.getByPlaceholderText('Ism')).toBeTruthy();
    expect(screen.getByPlaceholderText('Familiya')).toBeTruthy();
    expect(screen.getByPlaceholderText('90 123 45 67')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it("parolni ko'rsatish tugmasi secureTextEntry'ni almashtiradi", async () => {
    renderRegister();
    await settle();

    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.changeText(passwordInput, 'parol12345');
    expect(screen.getByPlaceholderText('••••••••').props.value).toBe('parol12345');
  });

  it('klaviatura ochilganda oxirgi maydonlar uchun joy qo\'shadi', async () => {
    const measureSpy = mockMeasureInWindow();
    // AuthShell klaviatura ochilishini o'zi eshitadi — obunachilarni ushlab olamiz.
    const handlers: Record<string, (event: any) => void> = {};
    const addListener = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: any) => {
      handlers[event] = handler;
      return { remove: jest.fn() };
    }) as any);

    renderRegister();
    await settle();

    // Platformaga qarab will*/did* nomlanadi — ikkalasini ham qabul qilamiz.
    const showEvent = Object.keys(handlers).find((name) => name.endsWith('Show'));
    const hideEvent = Object.keys(handlers).find((name) => name.endsWith('Hide'));
    expect(showEvent).toBeTruthy();
    expect(hideEvent).toBeTruthy();

    const passwordInput = screen.getByPlaceholderText('••••••••');
    fireEvent(passwordInput, 'focus', { nativeEvent: {} });

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    expect(StyleSheet.flatten(scrollView.props.contentContainerStyle).paddingBottom).toBeUndefined();

    // Klaviatura ochildi: ekranning pastki 312px'ini yopdi.
    await act(async () => {
      handlers[showEvent!]({ endCoordinates: { screenX: 0, screenY: KEYBOARD_TOP, width: 375, height: 312 } });
      await new Promise((r) => setTimeout(r, 80));
    });

    // Klaviatura yopgan balandlik + bo'shliq (24px) qadar joy qo'shiladi —
    // shu tufayli oxirgi maydonlar klaviatura tagida qolmaydi.
    expect(StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle).paddingBottom)
      .toBe(SCREEN_HEIGHT - KEYBOARD_TOP + 24);

    // Klaviatura yopilgach qo'shimcha joy olib tashlanadi.
    await act(async () => {
      handlers[hideEvent!]({ endCoordinates: { screenX: 0, screenY: SCREEN_HEIGHT, width: 375, height: 0 } });
      await new Promise((r) => setTimeout(r, 80));
    });

    expect(StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle).paddingBottom)
      .toBeUndefined();

    addListener.mockRestore();
    measureSpy.mockRestore();
  });
});
