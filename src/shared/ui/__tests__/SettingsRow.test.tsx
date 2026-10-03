import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import SettingsRow from '../SettingsRow';
import SettingsGroup from '../SettingsGroup';
import { AppThemeProvider } from '../../theme';

/**
 * Sozlamalar qatori: chapda nomi, o'ngda holati.
 *
 * Holat turlicha ko'rinadi - qiymat matni, kalit, tanlov belgisi yoki
 * strelka - lekin O'RNI o'zgarmaydi. Shu sababli qatorning qaysi turda
 * ekani shu yerda qulflanadi.
 */
const show = (node: React.ReactElement) =>
  render(<AppThemeProvider>{node}</AppThemeProvider>);

/** AppThemeProvider birinchi renderda null qaytaradi - uni tinchitamiz. */
const settle = () => act(async () => { await Promise.resolve(); });

describe('SettingsRow', () => {
  it('nomi korsatiladi', async () => {
    show(<SettingsRow label="Til" />);
    await settle();

    expect(screen.getByText('Til')).toBeTruthy();
  });

  it('qiymat ong chetda chiqadi', async () => {
    show(<SettingsRow label="Valyuta" value="So'm" />);
    await settle();

    expect(screen.getByText("So'm")).toBeTruthy();
  });

  it('bosilganda chaqiriladi', async () => {
    const onPress = jest.fn();
    show(<SettingsRow label="Shartlar" onPress={onPress} />);
    await settle();

    fireEvent.press(screen.getByRole('button', { name: 'Shartlar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  /** Tanlangan band ekranga "tanlangan" deb e'lon qilinadi. */
  it('tanlangan band belgilanadi', async () => {
    show(<SettingsRow label="English" selected onPress={() => {}} />);
    await settle();

    expect(screen.getByRole('button', { name: 'English' }).props.accessibilityState.selected)
      .toBe(true);
  });

  /** Bosilmaydigan qator tugma bo'lmaydi - bosib ko'rishga undamaydi. */
  it('bosilmaydigan qator tugma emas', async () => {
    show(<SettingsRow label="Versiya" value="1.0" />);
    await settle();

    expect(screen.queryByRole('button', { name: 'Versiya' })).toBeNull();
  });

  /** O'ng chetga kalit qo'yish mumkin. */
  it('ong chetdagi boshqaruv chiziladi', async () => {
    show(<SettingsRow label="Tungi rejim" trailing={<Text>kalit</Text>} />);
    await settle();

    expect(screen.getByText('kalit')).toBeTruthy();
  });
});

describe('SettingsGroup', () => {
  it('guruh sarlavhasi va bandlari chiqadi', async () => {
    show(
      <SettingsGroup title="Til">
        <SettingsRow label="O'zbekcha" selected />
        <SettingsRow label="English" isLast />
      </SettingsGroup>,
    );
    await settle();

    expect(screen.getByText('Til')).toBeTruthy();
    expect(screen.getByText("O'zbekcha")).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
  });

  /** Sarlavhasiz guruh ham mumkin - bandlar o'zi tushunarli bo'lsa. */
  it('sarlavhasiz guruh ham chiziladi', async () => {
    show(
      <SettingsGroup>
        <SettingsRow label="Chiqish" isLast />
      </SettingsGroup>,
    );
    await settle();

    expect(screen.getByText('Chiqish')).toBeTruthy();
  });
});
