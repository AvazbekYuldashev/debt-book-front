import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../lib/storage';
import {
  BACKGROUND_STORAGE_KEY,
  DEFAULT_BACKGROUND,
  parseBackground,
  serializeBackground,
  type BackgroundFit,
  type BackgroundSettings,
} from './backgroundSettings';

export interface BackgroundValue extends BackgroundSettings {
  /** Yangi rasm tanlandi (attach id). */
  setImage: (imageId: string) => void;
  /** Rasmni olib tashlash — bezakli SVG fonga qaytadi. */
  clearImage: () => void;
  setFit: (fit: BackgroundFit) => void;
  setDim: (dim: number) => void;
}

const BackgroundContext = createContext<BackgroundValue | undefined>(undefined);

/**
 * Foydalanuvchi foni holati.
 *
 * ThemeProvider bilan bir xil naqsh: qurilmada saqlanadi, o'qilmaguncha
 * standart qiymat ishlatiladi. Lekin bu yerda render TO'XTATILMAYDI —
 * mavzudan farqli o'laroq fon rasmi kech kelsa "miltillash" bo'lmaydi
 * (u shunchaki bir lahzadan keyin paydo bo'ladi), ilovani kutib turishga
 * majburlash esa ochilishni sekinlashtirardi.
 */
export const BackgroundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_BACKGROUND);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await storage.get(BACKGROUND_STORAGE_KEY);
      if (mounted && saved) setSettings(parseBackground(saved));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Har o'zgarishda saqlash (fire-and-forget) — sozlama yo'qolsa ilova
  // ishlashda davom etadi, shuning uchun xatoni kutib o'tirmaymiz.
  const update = useCallback((patch: Partial<BackgroundSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      storage.set(BACKGROUND_STORAGE_KEY, serializeBackground(next));
      return next;
    });
  }, []);

  const value = useMemo<BackgroundValue>(() => ({
    ...settings,
    setImage: (imageId: string) => update({ imageId: imageId.trim() }),
    clearImage: () => update({ imageId: '' }),
    setFit: (fit: BackgroundFit) => update({ fit }),
    setDim: (dim: number) => update({ dim }),
  }), [settings, update]);

  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
};

/**
 * Fon sozlamasi. Provider'siz ishlatilsa STANDART qiymat qaytadi — xato
 * tashlamaydi, chunki AmbientBackground testlarda provider'siz ham
 * render qilinadi va u yerda fon rasmi shunchaki yo'q bo'lishi to'g'ri.
 */
export function useBackground(): BackgroundValue {
  const context = useContext(BackgroundContext);
  return context ?? fallbackValue;
}

const noop = () => undefined;
const fallbackValue: BackgroundValue = {
  ...DEFAULT_BACKGROUND,
  setImage: noop,
  clearImage: noop,
  setFit: noop,
  setDim: noop,
};
