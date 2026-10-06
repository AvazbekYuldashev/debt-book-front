import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, Dimensions, useColorScheme } from 'react-native';
import { ColorTokens, darkColors, lightColors } from './colors';
import { applyWebTheme } from './applyWebTheme';
import { makeShadows, ShadowTokens } from './elevation';
import { makeGlass, GlassTokens } from './glass';
import { useBackground } from './BackgroundProvider';
import { useAccent } from './AccentProvider';
import { useTransparency } from './TransparencyProvider';
import { peekPhoto, samplePhoto } from './photoColor';
import { photoTheme, type PhotoSample } from './photoTone';
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
   * Ko'rsatilayotgan ko'rinish tanlangandan farq qiladi: fon rasmi to'q
   * (yoki och) bo'lgani uchun yozuvlar fonga qarama-qarshi rangda.
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
 * Rasm yo'q yoki o'lchab bo'lmasa (telefonda) - null.
 */
function usePhotoSample(imageId: string, fit: BackgroundFit): PhotoSample | null {
  /**
   * Ekran nisbati QURILMA ekranidan, oynadan emas.
   *
   * Web'da oyna o'lchami klaviatura ochilganda, manzil satri yashirinsa
   * yoki oyna cho'zilsa o'zgaradi - fon rasmi esa joyidan qimirlamaydi.
   * Oynaga bog'lansa, har safar boshqa kesim o'lchanib, mavzu yozish
   * paytida sakrab ketardi. Ilova 560px ustunga yig'iladi.
   */
  const [aspect] = useState(() => {
    const screen = Dimensions.get('screen');
    const width = Math.min(screen.width, APP_COLUMN_WIDTH);
    return screen.height > 0 ? Math.round((width / screen.height) * 20) / 20 : 0;
  });

  const url = imageId ? buildAttachUrl(imageId) : '';
  const key = `${url}|${fit}`;
  const [sample, setSample] = useState<{ url: string; key: string; value: PhotoSample } | null>(null);

  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    samplePhoto(url, fit, aspect).then((value) => {
      // Muvaffaqiyatsiz o'lchov oldingi natijani O'CHIRMAYDI: tarmoq bir
      // lahza uzilgani uchun ko'rinish sakramasin.
      if (alive && value) setSample({ url, key, value });
    });
    return () => {
      alive = false;
    };
  }, [url, fit, aspect, key]);

  if (!url) return null;
  if (sample && sample.key === key) return sample.value;
  // Saqlangan tayyor natija - birinchi chizishdanoq to'g'ri ko'rinish.
  const saved = peekPhoto(url, fit, aspect);
  if (saved) return saved;
  // Shu rasmning eski o'lchovi (masalan "Moslash" o'zgardi): yangisi
  // kelguncha u bilan qolamiz - tanlangan rejimga sakrab qaytmaymiz.
  return sample && sample.url === url ? sample.value : null;
}

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const systemScheme = useColorScheme();
  const { imageId, fit } = useBackground();
  const photo = usePhotoSample(imageId, fit);
  /**
   * Ko'rsatiladigan ko'rinish - odatda foydalanuvchi tanlagani.
   *
   * ISTISNO - fon rasmi: yozuv rangi fonga qarama-qarshi bo'lishi kerak.
   * Yorug' rejimda fon to'q bo'lsa yozuvlar oq (qorong'i ko'rinish),
   * qorong'i rejimda fon och bo'lsa - to'q. Tanlovning o'zi (`mode`)
   * o'zgarmaydi: rasm olib tashlansa yoki almashsa, u qaytadi.
   */
  const preferredTheme = resolveActiveTheme(mode, systemScheme);
  const activeTheme = imageId && photo ? photoTheme(preferredTheme, photo) : preferredTheme;
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
  // Shaffoflik darajasi foydalanuvchi sozlamasi: to'g'ri qiymat fonga
  // bog'liq va uni dastur bila olmaydi.
  const { level } = useTransparency();
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
