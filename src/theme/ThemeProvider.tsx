import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import { ColorTokens, darkColors, lightColors } from './colors';
import { loadInterFonts } from './fonts';
import { radius, spacing } from './spacing';
import { typography } from './typography';

type ThemeMode = 'light' | 'dark' | 'system';
type ActiveTheme = 'light' | 'dark';

interface ThemeValue {
  mode: ThemeMode;
  activeTheme: ActiveTheme;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  fontsLoaded: boolean;
  setMode: (nextMode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

function resolveActiveTheme(mode: ThemeMode, scheme: ColorSchemeName): ActiveTheme {
  if (mode === 'system') return scheme === 'dark' ? 'dark' : 'light';
  return mode;
}

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const systemScheme = useColorScheme();
  const activeTheme = resolveActiveTheme(mode, systemScheme);

  useEffect(() => {
    let mounted = true;
    loadInterFonts()
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setFontsLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((current) => {
      const resolved = resolveActiveTheme(current, Appearance.getColorScheme());
      return resolved === 'light' ? 'dark' : 'light';
    });
  }, []);

  const value = useMemo<ThemeValue>(() => ({
    mode,
    activeTheme,
    colors: activeTheme === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    typography,
    fontsLoaded,
    setMode,
    toggleTheme,
  }), [mode, activeTheme, toggleTheme, fontsLoaded]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useAppTheme(): ThemeValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return context;
}
