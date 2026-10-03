import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { storage } from '../lib/storage';
import { DEFAULT_ACCENT, findAccent } from './accent';

const ACCENT_STORAGE_KEY = 'debt-book.accent';

/** Qurilmadagi nusxa HAR HISOB UCHUN ALOHIDA - fon sozlamasi bilan bir xil. */
const accentKey = (profileId: string) => `${ACCENT_STORAGE_KEY}.${profileId}`;

export interface AccentValue {
  /** Tanlangan rang belgisi. */
  accent: string;
  setAccent: (id: string) => void;
  /** Hisob almashganda: serverdagi qiymatni qo'llaydi. */
  adoptAccent: (profileId: string | null, remote: string | null | undefined) => void;
}

const AccentContext = createContext<AccentValue | undefined>(undefined);

/**
 * Ilovaning asosiy rangi.
 *
 * Fon rasmi bilan bir xil naqsh: haqiqiy manba - server (hisobga
 * bog'langan), qurilmadagi nusxa esa faqat tez chizish uchun. Shuning
 * uchun bu provayder ham AppThemeProvider dan TASHQARIDA turadi - mavzu
 * unga bog'liq, u esa mavzuga bog'liq emas.
 */
export const AccentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accent, setAccentState] = useState<string>(DEFAULT_ACCENT);

  // Kimning sozlamasi ko'rsatilyapti. Ref: eskirgan qiymat boshqa
  // hisobning nusxasiga yozib yuborardi.
  const scope = useRef<string | null>(null);

  const adoptAccent = useCallback((profileId: string | null, remote: string | null | undefined) => {
    scope.current = profileId;

    if (!profileId) {
      setAccentState(DEFAULT_ACCENT);
      return;
    }

    if (remote) {
      const next = findAccent(remote).id;
      setAccentState(next);
      storage.set(accentKey(profileId), next);
      return;
    }

    void (async () => {
      const saved = await storage.get(accentKey(profileId));
      if (scope.current !== profileId) return; // hisob almashib ketdi
      setAccentState(findAccent(saved).id);
    })();
  }, []);

  const setAccent = useCallback((id: string) => {
    const next = findAccent(id).id;
    setAccentState(next);
    if (scope.current) storage.set(accentKey(scope.current), next);
  }, []);

  const value = useMemo<AccentValue>(
    () => ({ accent, setAccent, adoptAccent }),
    [accent, setAccent, adoptAccent],
  );

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
};

/**
 * Tanlangan rang. Provider'siz STANDART qaytadi — xato tashlamaydi,
 * chunki mavzu testlarda provider'siz ham quriladi.
 */
export function useAccent(): AccentValue {
  return useContext(AccentContext) ?? fallback;
}

const noop = () => undefined;
const fallback: AccentValue = {
  accent: DEFAULT_ACCENT,
  setAccent: noop,
  adoptAccent: noop,
};
