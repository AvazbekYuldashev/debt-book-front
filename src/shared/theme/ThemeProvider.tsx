import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, Dimensions, Platform, useColorScheme } from 'react-native';
import { ColorTokens, darkColors, lightColors } from './colors';
import { applyWebTheme } from './applyWebTheme';
import { makeShadows, ShadowTokens } from './elevation';
import { makeGlass, GlassTokens } from './glass';
import { useBackground } from './BackgroundProvider';
import { useAccent } from './AccentProvider';
import { useTransparency } from './TransparencyProvider';
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
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  /** Soya presetlari (card / raised / floating / nav) — mavzuga moslashgan. */
  shadows: ShadowTokens;
  /** Yarim shaffof "shisha" sirtlar (surface / raised / muted). */
  glass: GlassTokens;
  /**
   * Boshqa sirt ICHIDAGI bo'laklar uchun shisha: muzlatishsiz va oq
   * xiraliksiz (glass.ts GlassOptions.nested). To'g'ridan-to'g'ri
   * ishlatilmaydi - NestedGlass uni `glass` o'rniga beradi.
   */
  glassNested: GlassTokens;
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
  const { imageId } = useBackground();
  /**
   * Ko'rsatiladigan ko'rinish - HAR DOIM foydalanuvchi tanlagani.
   *
   * Bir muddat fon rasmi buni ag'dara olardi: yorug' rejim + to'q rasm
   * avtomatik oq yozuvli ko'rinishga o'tardi. Natijada to'q rasm
   * qo'yilganda "Yorug'", "Tungi" va "Tizim" uchalasi bir xil chiqdi va
   * sozlama BUZUQ bo'lib ko'rindi - tanlov o'zgarardi, ekran esa yo'q.
   *
   * Endi tanlov ustun. O'qilish esa SHAFFOFLIK darajasi bilan
   * boshqariladi: shovqinli rasmda "O'rta" yoki "Kam" tanlanadi.
   */
  const activeTheme = resolveActiveTheme(mode, systemScheme);
  // Shaffoflik darajasi foydalanuvchi sozlamasi: to'g'ri qiymat fonga
  // bog'liq va uni dastur bila olmaydi.
  const { level } = useTransparency();
  const hasPhoto = imageId.length > 0;
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
    const tinted = applyAccent(base, accent, activeTheme === 'dark');
    // Fon rasmi ustida kulrang matn bir pog'ona kontrastliroq: ortida
    // ixtiyoriy fotosurat turadi (colors.ts textSecondaryOnPhoto).
    return hasPhoto ? { ...tinted, textSecondary: tinted.textSecondaryOnPhoto } : tinted;
  }, [activeTheme, accent, hasPhoto]);

  /**
   * Web'da brauzer o'zi chizadigan qismlar - autofill foni, fokus halqasi,
   * manzil satri va sahifa foni - KO'RSATILAYOTGAN ko'rinishga moslanadi.
   * `colors` asosiy rang va fon rasmiga allaqachon moslangan: tanlangan
   * rejim bo'yicha bo'yalsa, to'q ilova ustida och panel qolardi. Native'da noop.
   */
  useEffect(() => {
    applyWebTheme(colors);
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
    () => makeGlass(colors, shadows, hasPhoto, level, activeTheme === 'dark'),
    [colors, shadows, hasPhoto, level, activeTheme],
  );
  // Telefonda muzlatish yo'q - ichki shisha tashqisi bilan bir xil.
  const glassNested = useMemo(
    () =>
      Platform.OS === 'web'
        ? makeGlass(colors, shadows, hasPhoto, level, activeTheme === 'dark', { nested: true })
        : glass,
    [colors, shadows, hasPhoto, level, activeTheme, glass],
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
    glassNested,
    iconSize,
    fontsLoaded,
    setMode: applyMode,
    toggleTheme,
  }), [mode, activeTheme, colors, shadows, glass, glassNested, toggleTheme, applyMode, fontsLoaded]);

  // Saqlangan mavzu o'qilmaguncha render qilmaymiz — light->dark "miltillash"ning oldini oladi.
  if (!hydrated) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Ichidagi hamma narsa BOSHQA SIRT ustida turadi: karta, sozlamalar guruhi,
 * dialog, ro'yxat kartasi. Shu daraxtda `useAppTheme().glass` muzlatishsiz
 * va oq xiraliksiz shisha qaytaradi (glassNested).
 *
 * Nega kontekst: tugma, chip, qidiruv maydoni o'zi qayerda turganini
 * bilmaydi - sarlavhada (rasm ustida, muzlatish kerak) yoki karta ichida
 * (ota sirt allaqachon muzlatgan; ikkinchi muzlatish kulrang plita
 * yasardi). Sirt chizadigan konteyner buni bir marta aytadi, ichidagi
 * barcha komponentlar o'zgarishsiz to'g'ri ishlaydi. Ichma-ich qo'yish
 * xavfsiz: ichkarida glass allaqachon glassNested.
 */
export const NestedGlass: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useAppTheme();
  const value = useMemo(
    () => (theme.glass === theme.glassNested ? theme : { ...theme, glass: theme.glassNested }),
    [theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useAppTheme(): ThemeValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return context;
}
