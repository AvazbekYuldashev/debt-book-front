import React, { useEffect } from 'react';
import { Platform, Text, TextInput } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ContactsProvider } from './src/context/ContactsContext';
import { AuthProvider } from './src/context/AuthContext';
import { WorkspaceProvider } from './src/context/WorkspaceContext';
import { ContactAvatarsProvider } from './src/shared/contactAvatars';
import { AppThemeProvider, useAppTheme } from './src/theme';
import { LanguageProvider } from './src/i18n';
import ErrorBoundary from './src/components/ErrorBoundary';
import { WEB_FONT_STACK } from './src/theme/fonts';

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

const AppShell: React.FC = () => {
  const { activeTheme, colors } = useAppTheme();

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
      <WorkspaceProvider>
        <ContactsProvider>
          <ContactAvatarsProvider>
            <NavigationContainer theme={navigationTheme}>
              <RootNavigator />
            </NavigationContainer>
          </ContactAvatarsProvider>
        </ContactsProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
};

export default function App() {
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
              <StatusBar style="auto" />
            </AppThemeProvider>
          </LanguageProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
