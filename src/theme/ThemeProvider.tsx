import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import { ColorTokens, darkColors, lightColors } from './colors';
import { applyAutofillStyle } from './applyAutofillStyle';
import { loadAppFonts } from './fonts';
import { radius, spacing } from './spacing';
import { typography } from './typography';
import { storage } from '../utils/storage';

type ThemeMode = 'light' | 'dark' | 'system';
type ActiveTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'debt-book.theme';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export interface ThemeValue {
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

function resolveActiveTheme(mode: ThemeMode, scheme: ColorSchemeName | null | undefined): ActiveTheme {
  if (mode === 'system') return scheme === 'dark' ? 'dark' : 'light';
  return mode;
}

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const systemScheme = useColorScheme();
  const activeTheme = resolveActiveTheme(mode, systemScheme);
  const colors = activeTheme === 'dark' ? darkColors : lightColors;

  // Web'da brauzer autofill fonini joriy theme'ga moslaymiz (native'da noop).
  useEffect(() => {
    applyAutofillStyle(colors);
  }, [colors]);

  // Saqlangan mavzu rejimini yuklash (yangilanganda tiklanib qolmasligi uchun).
  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await storage.get(THEME_STORAGE_KEY);
      if (mounted && isThemeMode(saved)) setMode(saved);
      if (mounted) setHydrated(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    loadAppFonts()
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setFontsLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Mavzuni o'zgartirish + saqlash (fire-and-forget).
  const applyMode = useCallback((next: ThemeMode) => {
    setMode(next);
    storage.set(THEME_STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((current) => {
      const resolved = resolveActiveTheme(current, Appearance.getColorScheme());
      const next: ThemeMode = resolved === 'light' ? 'dark' : 'light';
      storage.set(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeValue>(() => ({
    mode,
    activeTheme,
    colors,
    spacing,
    radius,
    typography,
    fontsLoaded,
    setMode: applyMode,
    toggleTheme,
  }), [mode, activeTheme, colors, toggleTheme, applyMode, fontsLoaded]);

  // Saqlangan mavzu o'qilmaguncha render qilmaymiz — light->dark "miltillash"ning oldini oladi.
  if (!hydrated) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useAppTheme(): ThemeValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return context;
}
