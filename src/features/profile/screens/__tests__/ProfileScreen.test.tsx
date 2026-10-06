import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import { AuthContext } from '../../../auth/context/AuthContext';
import { WorkspaceContext } from '../../../business/context/WorkspaceContext';
import ProfileScreen from '../ProfileScreen';
import { ROUTES } from '../../../../app/navigation/routes';

/**
 * Profil bo'limi uchta ekranga bo'lindi: ko'rish, tahrirlash, sozlamalar.
 * Bosh ekranning vazifasi - qolgan ikkalasiga yo'l ochish. Huquqiy hujjatlar
 * endi Sozlamalar ichida (ProfileSettingsScreen.test.tsx ga qarang).
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

const renderProfile = (navigate = jest.fn()) => {
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
                <ProfileScreen navigation={{ navigate } as any} />
              </NavigationContainer>
            </WorkspaceContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>
      </LanguageProvider>
    </AppThemeProvider>,
  );
  return { navigate };
};

const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });

afterEach(() => {
  activeQueryClients.forEach((client) => client.clear());
  activeQueryClients.length = 0;
});

describe('ProfileScreen — boshqa ekranlarga yo\'l', () => {
  it('tahrirlash va sozlamalar bandlarini ko\'rsatadi', async () => {
    renderProfile();
    await settle();

    expect(screen.getByText('Axborotni tahrirlash')).toBeTruthy();
    expect(screen.getByText('Sozlamalar')).toBeTruthy();
  });

  it('bandlar bosilganda tegishli ekranga o\'tadi', async () => {
    const { navigate } = renderProfile();
    await settle();

    fireEvent.press(screen.getByText('Axborotni tahrirlash'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PROFILE_EDIT);

    fireEvent.press(screen.getByText('Sozlamalar'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PROFILE_SETTINGS);
  });
});

describe('ProfileScreen — sessiya va xavfli amal', () => {
  /**
   * Chiqish va profilni o'chirish ENG OXIRIDA: ular ilgari muntazam
   * bosiladigan "To'lovlar" qatorining tepasida turardi va adashib
   * bosish oson edi.
   */
  it('chiqish va o\'chirish barcha kartalardan keyin turadi', async () => {
    renderProfile();
    await settle();

    const order = screen
      .getAllByText(/^(To'lovlar|Dastur haqida|Chiqish|Profilni o'chirish)$/)
      .map((node) => node.props.children);
    expect(order).toEqual(["To'lovlar", 'Dastur haqida', 'Chiqish', "Profilni o'chirish"]);
  });

  /** Qaytarib bo'lmaydigan amal "Chiqish" bilan bir xil yashil kiymasin. */
  it('o\'chirish tugmasi chiqishdan boshqa rangda', async () => {
    renderProfile();
    await settle();

    const colorOf = (label: string) =>
      StyleSheet.flatten(screen.getByText(label).props.style).color;
    expect(colorOf("Profilni o'chirish")).not.toBe(colorOf('Chiqish'));
  });
});
