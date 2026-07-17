import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../lib/storage';
import { Lang, LANGS, translations } from './translations';

export type { Lang } from './translations';
export { LANGS } from './translations';

const LANG_STORAGE_KEY = 'debt-book.language';

// ------------------------------------------------------------
// Module-level joriy til — React tashqarisidan (API qatlami) ham
// o'qiladi. LanguageProvider buni yangilab turadi.
// ------------------------------------------------------------
let currentLang: Lang = 'uz';

function isLang(value: unknown): value is Lang {
  return value === 'uz' || value === 'ru' || value === 'en';
}

export function getCurrentLang(): Lang {
  return currentLang;
}

/** Backend Accept-Language header uchun: 'UZ' | 'RU' | 'EN'. */
export function getApiLanguage(): string {
  return currentLang.toUpperCase();
}

/** Tarjima qilish (React tashqarisida ham ishlatsa bo'ladi). */
export function translate(
  key: string,
  lang: Lang = currentLang,
  params?: Record<string, string | number>,
): string {
  const dict = translations[lang] || translations.uz;
  let text = dict[key] ?? translations.uz[key] ?? key;
  if (params) {
    for (const k of Object.keys(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    }
  }
  return text;
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  langs: typeof LANGS;
}

const I18nContext = createContext<I18nValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(currentLang);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await storage.get(LANG_STORAGE_KEY);
      if (!cancelled && isLang(saved)) {
        currentLang = saved;
        setLangState(saved);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = useCallback((next: Lang) => {
    currentLang = next;
    setLangState(next);
    storage.set(LANG_STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(key, lang, params),
    [lang],
  );

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t, langs: LANGS }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside LanguageProvider');
  }
  return context;
}
