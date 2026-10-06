import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import Input from '../Input';
import SearchField from '../SearchField';
import { AppThemeProvider, useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { LanguageProvider } from '../../i18n';

/**
 * Matn maydonlari fokusni O'Z chegarasi bilan ko'rsatadi.
 *
 * Web'dagi umumiy fokus halqasi sichqoncha/barmoq bilan bosilganda
 * chizilmaydi - shuning uchun maydonning o'z chegarasi yagona ko'rsatkich.
 * Chaqiruvchi onFocus/onBlur bersa ham u yo'qolmasligi kerak (ilgari
 * `{...props}` bizning handlerni almashtirib, chegarani o'chirardi).
 */

let theme: ThemeValue;
const Probe = () => {
  theme = useAppTheme();
  return null;
};

const show = (node: React.ReactElement) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <Probe />
        {node}
      </LanguageProvider>
    </AppThemeProvider>,
  );

/** AppThemeProvider birinchi renderda null qaytaradi - uni tinchitamiz. */
const settle = () => act(async () => { await Promise.resolve(); });

const borderOf = (node: ReactTestInstance) => StyleSheet.flatten(node.props.style).borderColor;

/** Eng yaqin host (View) ota - SearchField'ning "pill" o'ramasi. */
const hostParent = (node: ReactTestInstance): ReactTestInstance => {
  let current = node.parent;
  while (current && typeof current.type !== 'string') current = current.parent;
  if (!current) throw new Error('host ota topilmadi');
  return current;
};

describe('Input fokusi', () => {
  it("chaqiruvchining onFocus/onBlur'i chegarani o'chirmaydi", async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    show(<Input label="Izoh" placeholder="Yozing" onFocus={onFocus} onBlur={onBlur} />);
    await settle();

    const field = screen.getByPlaceholderText('Yozing');
    expect(borderOf(field)).toBe('transparent');

    fireEvent(field, 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(borderOf(screen.getByPlaceholderText('Yozing'))).toBe(theme.colors.primary);

    fireEvent(field, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(borderOf(screen.getByPlaceholderText('Yozing'))).toBe('transparent');
  });

  it("web halqasi o'chiq - fokusni maydon o'zi chizadi", async () => {
    show(<Input label="Izoh" placeholder="Yozing" />);
    await settle();

    expect(screen.getByPlaceholderText('Yozing').props.dataSet).toEqual({ focus: 'self' });
  });
});

describe('SearchField fokusi', () => {
  it("fokusda chegara brand rangida, onFocus/onBlur ham chaqiriladi", async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    show(
      <SearchField
        value=""
        onChangeText={() => {}}
        accessibilityLabel="Qidiruv"
        onFocus={onFocus}
        onBlur={onBlur}
      />,
    );
    await settle();

    const field = screen.getByLabelText('Qidiruv');
    const resting = borderOf(hostParent(field));
    expect(resting).not.toBe(theme.colors.primary);

    fireEvent(field, 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(borderOf(hostParent(screen.getByLabelText('Qidiruv')))).toBe(theme.colors.primary);

    fireEvent(field, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(borderOf(hostParent(screen.getByLabelText('Qidiruv')))).toBe(resting);
  });

  it("web halqasi o'chiq - fokusni maydon o'zi chizadi", async () => {
    show(<SearchField value="" onChangeText={() => {}} accessibilityLabel="Qidiruv" />);
    await settle();

    expect(screen.getByLabelText('Qidiruv').props.dataSet).toEqual({ focus: 'self' });
  });
});
