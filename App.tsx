import React, { useEffect } from 'react';
import { AppState, AppStateStatus, Platform, Text, TextInput } from 'react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/app/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ContactsProvider } from './src/features/debts/context/ContactsContext';
import { AuthProvider } from './src/features/auth/context/AuthContext';
import { WorkspaceProvider } from './src/features/business/context/WorkspaceContext';
import { CurrencyProvider } from './src/features/debts/context/CurrencyContext';
import { ContactAvatarsProvider } from './src/features/debts/context/contactAvatars';
import { AppThemeProvider, useAppTheme } from './src/shared/theme';
import { LanguageProvider } from './src/shared/i18n';
import ErrorBoundary from './src/shared/ui/ErrorBoundary';
import { WEB_FONT_STACK } from './src/shared/theme/fonts';

// Web'da Inter'ni BARCHA matnga global qo'llaymiz (ekranlar fontFamily belgilamaydi).
// Modul yuklanishida — birinchi render'dan oldin bajariladi.
if (Platform.OS === 'web') {
  const webFontStyle = { fontFamily: WEB_FONT_STACK };
  const TextWithDefaults = Text as unknown as { defaultProps?: { style?: unknown } };
  TextWithDefaults.defaultProps = { ...(TextWithDefaults.defaultProps || {}), style: webFontStyle };
  const InputWithDefaults = TextInput as unknown as { defaultProps?: { style?: unknown } };
  InputWithDefaults.defaultProps = { ...(InputWithDefaults.defaultProps || {}), style: webFontStyle };
}

// Server-state uchun yagona QueryClient (cache + retry + dedup). Modul darajasida — bitta nusxa.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

/**
 * Native'da React Query "fokus" tushunchasini AppState'ga bog'laymiz:
 * ilova fonga o'tsa barcha refetchInterval polling'lar to'xtaydi (batareya/tarmoq),
 * qaytganda refetchOnWindowFocus'li query'lar darhol yangilanadi. Web'da brauzer
 * focus/visibility hodisalari buni o'zi qiladi.
 */
function useAppStateFocusManager(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);
}

const AppShell: React.FC = () => {
  const { activeTheme, colors } = useAppTheme();

  // RN 0.85+/Android 15+ edge-to-edge majburiy bo'lgani uchun status bar rangini
  // endi ilova o'zi belgilay olmaydi (backgroundColor/translucent olib tashlandi) —
  // faqat matn yorug'ligi (style) joriy mavzuga moslashtiriladi.
  const statusBar = (
    <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
  );

  const navigationTheme = activeTheme === 'dark'
    ? {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.primary,
      },
    }
    : {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.primary,
      },
    };

  return (
    <AuthProvider>
      <CurrencyProvider>
        <WorkspaceProvider>
          <ContactsProvider>
            <ContactAvatarsProvider>
              {statusBar}
              <NavigationContainer theme={navigationTheme}>
                <RootNavigator />
              </NavigationContainer>
            </ContactAvatarsProvider>
          </ContactsProvider>
        </WorkspaceProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
};

export default function App() {
  useAppStateFocusManager();

  useEffect(() => {
    if (!__DEV__) return;

    const originalError = console.error;
    const originalWarn = console.warn;
    console.error = (...args: unknown[]) => {
      const first = typeof args[0] === 'string' ? args[0] : '';
      if (first.includes('setNativeProps is deprecated')) return;
      if (first.includes('Download the React DevTools for a better development experience')) return;
      originalError(...args);
    };
    console.warn = (...args: unknown[]) => {
      const first = typeof args[0] === 'string' ? args[0] : '';
      if (first.includes('setNativeProps is deprecated')) return;
      if (first.includes('Download the React DevTools for a better development experience')) return;
      originalWarn(...args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <LanguageProvider>
            <AppThemeProvider>
              <AppShell />
            </AppThemeProvider>
          </LanguageProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
