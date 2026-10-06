import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import { AuthContext } from '../../../auth/context/AuthContext';
import { WorkspaceContext } from '../../../business/context/WorkspaceContext';
import ProfileSettingsScreen from '../ProfileSettingsScreen';
import { ROUTES } from '../../../../app/navigation/routes';

/**
 * Huquqiy hujjatlar profil bo'limi qayta tuzilganda Sozlamalar ekraniga
 * ko'chdi. Muhim shart o'zgarmadi: uchala hujjat login qilinmagan holatda
 * ham ko'rinishi va ochilishi kerak - do'kon talabi shunday.
 */

const authValue = {
  profile: null,
  isAuthReady: true,
  setProfile: jest.fn(),
} as any;

const wsValue = {
  workspace: {
    mode: 'personal',
    activeBusinessId: null,
    activeBusinessName: null,
    activeBusinessRole: null,
  },
  isWorkspaceReady: true,
  setPersonalWorkspace: jest.fn(),
  setBusinessWorkspace: jest.fn(),
  clearWorkspace: jest.fn(),
} as any;

// Yaratilgan QueryClient'lar test oxirida tozalanadi — aks holda cacheTime GC
// timerlari jest worker'ini ushlab turadi ("worker failed to exit" ogohlantirishi).
const activeQueryClients: QueryClient[] = [];

const renderSettings = () => {
  const navigate = jest.fn();
  const goBack = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  activeQueryClients.push(queryClient);
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={authValue}>
            <WorkspaceContext.Provider value={wsValue}>
              <NavigationContainer>
                <ProfileSettingsScreen
                  navigation={{ navigate, goBack } as any}
                  route={{ key: 'settings', name: ROUTES.PROFILE_SETTINGS } as any}
                />
              </NavigationContainer>
            </WorkspaceContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>
      </LanguageProvider>
    </AppThemeProvider>,
  );
  return { navigate, goBack };
};

const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });

afterEach(async () => {
  activeQueryClients.forEach((client) => client.clear());
  activeQueryClients.length = 0;
  // Tanlangan mavzu/til saqlanadi - keyingi test standart holatdan boshlansin.
  await AsyncStorage.clear();
});

describe("ProfileSettingsScreen — Huquqiy hujjatlar bo'limi", () => {
  it("uchala huquqiy hujjat bandini (login qilinmagan bo'lsa ham) ko'rsatadi", async () => {
    renderSettings();
    await settle();

    expect(screen.getByText('Ommaviy oferta')).toBeTruthy();
    expect(screen.getByText('Foydalanish shartlari')).toBeTruthy();
    expect(screen.getByText('Maxfiylik siyosati')).toBeTruthy();
  });

  it('bandlar bosilganda tegishli ekranga navigatsiya qiladi', async () => {
    const { navigate } = renderSettings();
    await settle();

    fireEvent.press(screen.getByText('Ommaviy oferta'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.OFFER);

    fireEvent.press(screen.getByText('Foydalanish shartlari'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.TERMS);

    fireEvent.press(screen.getByText('Maxfiylik siyosati'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PRIVACY_POLICY);
  });
});

/**
 * Tanlov guruhlari (til, mavzu, rang, shaffoflik) - RADIO: bittasi
 * belgilangan, qolganlari belgisiz va strelkasiz. Hujjat bandlari esa
 * sahifa ochadi - ular tugma. Ikkisi bir xil ko'rinmasligi kerak.
 */
describe('ProfileSettingsScreen — tanlov va navigatsiya qatorlari', () => {
  it('mavzu bandlari radio, tanlangani belgilangan', async () => {
    renderSettings();
    await settle();

    // Saqlangan rejim yo'q - standart "Tizim".
    expect(screen.getByRole('radio', { name: 'Tizim', checked: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Tungi', checked: false })).toBeTruthy();
  });

  it('band bosilganda belgi unga o\'tadi', async () => {
    renderSettings();
    await settle();

    fireEvent.press(screen.getByRole('radio', { name: 'Tungi' }));
    await settle();

    expect(screen.getByRole('radio', { name: 'Tungi', checked: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Tizim', checked: false })).toBeTruthy();
  });

  it('hujjat bandlari radio emas, tugma', async () => {
    renderSettings();
    await settle();

    expect(screen.getByRole('button', { name: 'Ommaviy oferta' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Ommaviy oferta' })).toBeNull();
  });
});
