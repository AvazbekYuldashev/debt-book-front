import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
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

afterEach(() => {
  activeQueryClients.forEach((client) => client.clear());
  activeQueryClients.length = 0;
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
