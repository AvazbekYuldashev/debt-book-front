import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ContactsProvider } from './src/context/ContactsContext';
import { AuthProvider } from './src/context/AuthContext';
import { AppThemeProvider, useAppTheme } from './src/theme';

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
      <ContactsProvider>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </ContactsProvider>
    </AuthProvider>
  );
};

export default function App() {
  useEffect(() => {
    if (!__DEV__) return;

    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const first = typeof args[0] === 'string' ? args[0] : '';
      if (first.includes('setNativeProps is deprecated')) return;
      if (first.includes('Download the React DevTools for a better development experience')) return;
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AppShell />
        <StatusBar style="auto" />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
