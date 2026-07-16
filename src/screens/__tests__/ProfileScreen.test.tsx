import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { AppThemeProvider } from '../../theme';
import { LanguageProvider } from '../../i18n';
import { AuthContext } from '../../context/AuthContext';
import { WorkspaceContext } from '../../context/WorkspaceContext';
import ProfileScreen from '../ProfileScreen';
import { ROUTES } from '../../navigation/routes';

const authValue = {
  profile: null,
  isAuthReady: true,
  setProfile: jest.fn(),
} as any;

const wsValue = {
  workspace: { mode: 'personal', activeBusinessId: null, activeBusinessName: null, activeBusinessRole: null },
  isWorkspaceReady: true,
  setPersonalWorkspace: jest.fn(),
  setBusinessWorkspace: jest.fn(),
  clearWorkspace: jest.fn(),
} as any;

// Yaratilgan QueryClient'lar test oxirida tozalanadi — aks holda cacheTime GC
// timerlari jest worker'ini ushlab turadi ("worker failed to exit" ogohlantirishi).
const activeQueryClients: QueryClient[] = [];

const renderProfile = (navigate = jest.fn()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
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

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

afterEach(() => {
  activeQueryClients.forEach((client) => client.clear());
  activeQueryClients.length = 0;
});

describe('ProfileScreen — Huquqiy hujjatlar bo\'limi', () => {
  it("uchala huquqiy hujjat bandini (login qilinmagan bo'lsa ham) ko'rsatadi", async () => {
    renderProfile();
    await settle();

    expect(screen.getByText('Ommaviy oferta')).toBeTruthy();
    expect(screen.getByText('Foydalanish shartlari')).toBeTruthy();
    expect(screen.getByText('Maxfiylik siyosati')).toBeTruthy();
  });

  it("bandlar bosilganda tegishli ekranga navigatsiya qiladi", async () => {
    const { navigate } = renderProfile();
    await settle();

    fireEvent.press(screen.getByText('Ommaviy oferta'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.OFFER);

    fireEvent.press(screen.getByText('Foydalanish shartlari'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.TERMS);

    fireEvent.press(screen.getByText('Maxfiylik siyosati'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PRIVACY_POLICY);
  });
});
