import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import { ColorTokens, darkColors, lightColors } from './colors';
import { applyAutofillStyle } from './applyAutofillStyle';
import { makeShadows, ShadowTokens } from './elevation';
import { makeGlass, GlassTokens } from './glass';
import { useBackground } from './BackgroundProvider';
import { useAccent } from './AccentProvider';
import { applyAccent } from './accent';
import { loadAppFonts } from './fonts';
import { iconSize } from './iconSizes';
import { radius, spacing } from './spacing';
import { typography } from './typography';
import { storage } from '../lib/storage';

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
  /** Soya presetlari (card / raised / floating / nav) — mavzuga moslashgan. */
  shadows: ShadowTokens;
  /** Yarim shaffof "shisha" sirtlar (surface / raised / muted). */
  glass: GlassTokens;
  /** Ikonka o'lchamlari shkalasi. */
  iconSize: typeof iconSize;
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
  /**
   * Mavzu palitrasi + foydalanuvchi tanlagan ASOSIY RANG.
   *
   * Brand rangi ilovada 67 ta faylda `colors.primary` orqali o'qiladi,
   * shuning uchun tokenni shu yerda almashtirish butun ilovani qayta
   * bo'yash uchun yetarli - har elementni alohida tahrirlash shart emas.
   *
   * Moliyaviy ranglar (qarz/haq) bunga kirmaydi: ular brand emas, MA'NO.
   */
  const { accent } = useAccent();
  const colors = useMemo(() => {
    const base = activeTheme === 'dark' ? darkColors : lightColors;
    return applyAccent(base, accent, activeTheme === 'dark');
  }, [activeTheme, accent]);

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

  // Soya rangi mavzudan keladi (light: ko'kimtir navy, dark: qora) — presetlar
  // faqat shu rang o'zgarganda qayta yasaladi.
  const shadows = useMemo(() => makeShadows(colors.shadow), [colors.shadow]);

  /**
   * Shisha sirtlar soyaga tayanadi — shuning uchun soyalardan KEYIN yasaladi.
   *
   * FON RASMI ham hisobga olinadi: shisha retsepti ilovaning o'z bezakli
   * foni uchun o'ylangan va ixtiyoriy fotosurat ustida boshqacha
   * ishlaydi. Shu sababli BackgroundProvider daraxtda bu provayderdan
   * TASHQARIDA turadi - u mavzuga bog'liq emas, mavzu esa unga bog'liq.
   */
  const { imageId } = useBackground();
  const glass = useMemo(
    () => makeGlass(colors, shadows, imageId.length > 0),
    [colors, shadows, imageId],
  );

  const value = useMemo<ThemeValue>(() => ({
    mode,
    activeTheme,
    colors,
    spacing,
    radius,
    typography,
    shadows,
    glass,
    iconSize,
    fontsLoaded,
    setMode: applyMode,
    toggleTheme,
  }), [mode, activeTheme, colors, shadows, glass, toggleTheme, applyMode, fontsLoaded]);

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
