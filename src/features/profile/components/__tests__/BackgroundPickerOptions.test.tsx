import React from 'react';
import { Image, Platform, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppThemeProvider } from '../../../../shared/theme';
import { BackgroundProvider } from '../../../../shared/theme/BackgroundProvider';
import { LanguageProvider } from '../../../../shared/i18n';
import { AuthContext } from '../../../auth/context/AuthContext';
import BackgroundPicker from '../BackgroundPicker';
import { pickAndUploadImage } from '../../lib/pickImage';

/**
 * Moslash va Xiralik variantlari - bittasigina tanlanadigan guruh (radio),
 * namuna esa ekrandagi fon kabi chiziladi: xiralik rasmni kattalashtirmaydi.
 */
jest.mock('../../lib/pickImage', () => ({
  pickAndUploadImage: jest.fn(),
}));

const mockPick = pickAndUploadImage as jest.MockedFunction<typeof pickAndUploadImage>;

const authValue = {
  profile: { jwt: 'test-token' },
  isAuthReady: true,
  setProfile: jest.fn(),
} as any;

const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });

const renderWithPhoto = async () => {
  mockPick.mockResolvedValue({ status: 'ok', id: 'attach-1' });
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <BackgroundProvider>
          <AuthContext.Provider value={authValue}>
            <BackgroundPicker />
          </AuthContext.Provider>
        </BackgroundProvider>
      </LanguageProvider>
    </AppThemeProvider>,
  );
  await settle();
  fireEvent.press(screen.getByText('Rasm tanlash'));
  await settle();
};

beforeEach(async () => {
  mockPick.mockReset();
  await AsyncStorage.clear();
});

afterEach(() => jest.restoreAllMocks());

describe('BackgroundPicker variantlari', () => {
  it('moslash va xiralik radio, tanlangani belgilangan', async () => {
    await renderWithPhoto();

    const radios = screen.getAllByRole('radio');
    // 2 ta moslash + 4 ta xiralik.
    expect(radios).toHaveLength(6);
    const checked = radios.filter((radio) => radio.props.accessibilityState?.checked);
    // Standart: To'ldirish + Kam.
    expect(checked).toHaveLength(2);

    fireEvent.press(screen.getByText("Sig'dirish"));
    await settle();

    const fit = screen.getByRole('radio', { name: /Sig'dirish/ });
    expect(fit.props.accessibilityState).toEqual({ checked: true });
  });

  it("web'da xiralik varianti Space bilan tanlanadi", async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderWithPhoto();

    const strong = screen.getByRole('radio', { name: /Kuchli/ });
    const preventDefault = jest.fn();
    act(() => {
      strong.props.onKeyDown({ key: ' ', preventDefault });
    });
    await settle();

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('radio', { name: /Kuchli/ }).props.accessibilityState).toEqual({ checked: true });
  });

  it("namuna rasmi kattalashtirilmaydi - quti aynan namuna maydoni", async () => {
    await renderWithPhoto();

    fireEvent.press(screen.getByText('Kuchli'));
    await settle();

    const image = screen.UNSAFE_getByType(Image);
    expect(StyleSheet.flatten(image.props.style)).toEqual(StyleSheet.absoluteFill);
    expect(image.props.blurRadius).toBeGreaterThan(0);
  });

  it('blok sarlavhasi ichkarida takrorlanmaydi (SettingsGroup nomlaydi)', async () => {
    await renderWithPhoto();

    // "Fon rasmi" faqat namuna yorlig'ida - alohida sarlavha qatori yo'q.
    expect(screen.getAllByText('Fon rasmi')).toHaveLength(1);
  });
});
