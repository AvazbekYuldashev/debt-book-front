import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme, useWindowDimensions } from 'react-native';
import { ColorTokens, darkColors, lightColors } from './colors';
import { applyAutofillStyle } from './applyAutofillStyle';
import { makeShadows, ShadowTokens } from './elevation';
import { makeGlass, GlassTokens } from './glass';
import { useBackground } from './BackgroundProvider';
import { useAccent } from './AccentProvider';
import { useTransparency } from './TransparencyProvider';
import { samplePhoto } from './photoColor';
import { readableTheme, type PhotoSample } from './photoTone';
import type { BackgroundFit } from './backgroundSettings';
import { APP_COLUMN_WIDTH } from './layout';
import { applyAccent } from './accent';
import { loadAppFonts } from './fonts';
import { iconSize } from './iconSizes';
import { radius, spacing } from './spacing';
import { typography } from './typography';
import { storage } from '../lib/storage';
import { buildAttachUrl } from '../lib/attachUrl';

export type ThemeMode = 'light' | 'dark' | 'system';
type ActiveTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'debt-book.theme';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export interface ThemeValue {
  mode: ThemeMode;
  activeTheme: ActiveTheme;
  /**
   * Ko'rsatilayotgan mavzu tanlangandan farq qiladi: fon rasmi ustida
   * tanlangan mavzuning matni o'qilmagani uchun almashtirilgan.
   */
  photoAdapted: boolean;
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

/**
 * Fon rasmining ekranda ko'rinadigan qismi, kataklarga bo'lingan.
 * Rasm yo'q yoki o'lchab bo'lmasa - null.
 *
 * Natija qaysi o'lchovga tegishli ekani ham saqlanadi: rasm almashganda
 * yangisi o'lchanguncha ESKI rasm bilan qaror qilinmasin.
 */
function usePhotoSample(imageId: string, fit: BackgroundFit): PhotoSample | null {
  // Ekran nisbati: web'da ilova 560px ustunga yig'iladi, rasm esa shu
  // ustunni to'ldiradi. Mayda o'zgarishlarda qayta o'lchanmasin deb
  // yaxlitlanadi.
  const screen = useWindowDimensions();
  const width = Math.min(screen.width, APP_COLUMN_WIDTH);
  const aspect = screen.height > 0 ? Math.round((width / screen.height) * 20) / 20 : 0;

  const url = imageId ? buildAttachUrl(imageId) : '';
  const key = `${url}|${fit}|${aspect}`;
  const [sample, setSample] = useState<{ key: string; value: PhotoSample } | null>(null);

  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    samplePhoto(url, fit, aspect).then((value) => {
      if (alive) setSample(value ? { key, value } : null);
    });
    return () => {
      alive = false;
    };
  }, [url, fit, aspect, key]);

  return sample && sample.key === key ? sample.value : null;
}

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const systemScheme = useColorScheme();
  const { imageId, dim, fit } = useBackground();
  // Shaffoflik darajasi foydalanuvchi sozlamasi: to'g'ri qiymat fonga
  // bog'liq va uni dastur bila olmaydi.
  const { level } = useTransparency();
  const photo = usePhotoSample(imageId, fit);
  /**
   * Ko'rsatiladigan mavzu - odatda foydalanuvchi tanlagani.
   *
   * ISTISNO: fon rasmi ustida shaffof sirtda matn rasmning o'zida turadi.
   * Yorug' mavzudagi to'q matn to'q rasmda (yoki aksincha) o'qilmay
   * qolsa, matni o'qiladigan mavzu ko'rsatiladi. Tanlovning o'zi
   * (`mode`) o'zgarmaydi: rasm yoki shaffoflik almashsa, u qaytadi.
   */
  const preferredTheme = resolveActiveTheme(mode, systemScheme);
  const activeTheme =
    imageId && photo ? readableTheme(preferredTheme, photo, dim, level) : preferredTheme;
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
  const glass = useMemo(
    () => makeGlass(colors, shadows, imageId.length > 0, level, activeTheme === 'dark'),
    [colors, shadows, imageId, level, activeTheme],
  );

  const value = useMemo<ThemeValue>(() => ({
    mode,
    activeTheme,
    photoAdapted: activeTheme !== preferredTheme,
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
  }), [mode, activeTheme, preferredTheme, colors, shadows, glass, toggleTheme, applyMode, fontsLoaded]);

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
