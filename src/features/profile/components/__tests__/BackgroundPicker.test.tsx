import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppThemeProvider } from '../../../../shared/theme';
import { BackgroundProvider } from '../../../../shared/theme/BackgroundProvider';
import { LanguageProvider } from '../../../../shared/i18n';
import { AuthContext } from '../../../auth/context/AuthContext';
import BackgroundPicker from '../BackgroundPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickAndUploadImage } from '../../lib/pickImage';

jest.mock('../../lib/pickImage', () => ({
  pickAndUploadImage: jest.fn(),
}));

const mockPick = pickAndUploadImage as jest.MockedFunction<typeof pickAndUploadImage>;

const authValue = {
  profile: { jwt: 'test-token' },
  isAuthReady: true,
  setProfile: jest.fn(),
} as any;

const renderPicker = () =>
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

const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });

beforeEach(async () => {
  mockPick.mockReset();
  // Fon sozlamasi QURILMADA saqlanadi — testlar orasida tozalanmasa,
  // oldingi testda qo'yilgan rasm keyingisiga o'tib ketadi.
  await AsyncStorage.clear();
});

describe('BackgroundPicker', () => {
  it("rasm yo'q bo'lsa faqat tanlash taklif qilinadi", async () => {
    renderPicker();
    await settle();

    expect(screen.getByText("Fon rasmi qo‘yilmagan")).toBeTruthy();
    expect(screen.getByText('Rasm tanlash')).toBeTruthy();
    // Moslash va xiralik rasmsiz ma'nosiz — ko'rinmasligi kerak.
    expect(screen.queryByText('Moslash')).toBeNull();
    expect(screen.queryByText('Xiralik')).toBeNull();
    expect(screen.queryByText('Olib tashlash')).toBeNull();
  });

  it('rasm tanlangach moslash va xiralik paydo bo‘ladi', async () => {
    mockPick.mockResolvedValue({ status: 'ok', id: 'attach-1' });
    renderPicker();
    await settle();

    fireEvent.press(screen.getByText('Rasm tanlash'));
    await settle();

    expect(mockPick).toHaveBeenCalledWith('test-token');
    expect(screen.getByText('Moslash')).toBeTruthy();
    expect(screen.getByText('Xiralik')).toBeTruthy();
    expect(screen.getByText('Olib tashlash')).toBeTruthy();
    // Tugma matni "boshqa rasm"ga o'zgaradi.
    expect(screen.getByText('Boshqa rasm')).toBeTruthy();
  });

  it('olib tashlangach yana bo‘sh holatga qaytadi', async () => {
    mockPick.mockResolvedValue({ status: 'ok', id: 'attach-1' });
    renderPicker();
    await settle();

    fireEvent.press(screen.getByText('Rasm tanlash'));
    await settle();
    fireEvent.press(screen.getByText('Olib tashlash'));
    await settle();

    expect(screen.getByText("Fon rasmi qo‘yilmagan")).toBeTruthy();
    expect(screen.queryByText('Moslash')).toBeNull();
  });

  it('bekor qilinsa xato ko‘rsatilmaydi', async () => {
    mockPick.mockResolvedValue({ status: 'canceled' });
    renderPicker();
    await settle();

    fireEvent.press(screen.getByText('Rasm tanlash'));
    await settle();

    expect(screen.queryByText('Rasmni yuklab bo‘lmadi')).toBeNull();
    expect(screen.getByText("Fon rasmi qo‘yilmagan")).toBeTruthy();
  });

  it('yuklash xatosi foydalanuvchiga aytiladi', async () => {
    mockPick.mockResolvedValue({ status: 'error' });
    renderPicker();
    await settle();

    fireEvent.press(screen.getByText('Rasm tanlash'));
    await settle();

    expect(screen.getByText('Rasmni yuklab bo‘lmadi')).toBeTruthy();
  });

  it('kutilmagan xatoda ham ilova yiqilmaydi', async () => {
    mockPick.mockRejectedValue(new Error('tarmoq'));
    renderPicker();
    await settle();

    fireEvent.press(screen.getByText('Rasm tanlash'));
    await settle();

    expect(screen.getByText('Rasmni yuklab bo‘lmadi')).toBeTruthy();
    // Tugma yana bosiladigan holatga qaytdi (busy o'chdi).
    expect(screen.getByText('Rasm tanlash')).toBeTruthy();
  });

  it('moslash rejimi almashtiriladi', async () => {
    mockPick.mockResolvedValue({ status: 'ok', id: 'attach-1' });
    renderPicker();
    await settle();

    fireEvent.press(screen.getByText('Rasm tanlash'));
    await settle();

    // Ikkala variant ham bor; sig'dirishga o'tkazamiz.
    fireEvent.press(screen.getByText('Sig‘dirish'));
    await settle();
    expect(screen.getByText('Sig‘dirish')).toBeTruthy();
  });
});
