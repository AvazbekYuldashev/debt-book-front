import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { storage } from '../lib/storage';
import { DEFAULT_TRANSPARENCY, findTransparency, type TransparencyLevel } from './transparency';

const STORAGE_KEY = 'debt-book.glass';

/** Qurilmadagi nusxa HAR HISOB UCHUN ALOHIDA - rang sozlamasi bilan bir xil. */
const levelKey = (profileId: string) => `${STORAGE_KEY}.${profileId}`;

export interface TransparencyValue {
  level: TransparencyLevel;
  setLevel: (id: TransparencyLevel) => void;
  /** Hisob almashganda: serverdagi qiymatni qo'llaydi. */
  adoptLevel: (profileId: string | null, remote: string | null | undefined) => void;
}

const TransparencyContext = createContext<TransparencyValue | undefined>(undefined);

/**
 * Sirtlarning shaffoflik darajasi.
 *
 * Fon rasmi va ilova rangi bilan bir xil naqsh: haqiqiy manba - server
 * (hisobga bog'langan), qurilmadagi nusxa esa faqat tez chizish uchun.
 * Shuning uchun bu provayder ham AppThemeProvider dan TASHQARIDA turadi
 * - mavzu unga tayanadi, u esa mavzuga tayanmaydi.
 */
export const TransparencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [level, setLevelState] = useState<TransparencyLevel>(DEFAULT_TRANSPARENCY);

  // Kimning sozlamasi ko'rsatilyapti. Ref: eskirgan qiymat boshqa
  // hisobning nusxasiga yozib yuborardi.
  const scope = useRef<string | null>(null);

  const adoptLevel = useCallback((profileId: string | null, remote: string | null | undefined) => {
    scope.current = profileId;

    if (!profileId) {
      setLevelState(DEFAULT_TRANSPARENCY);
      return;
    }

    if (remote) {
      const next = findTransparency(remote);
      setLevelState(next);
      storage.set(levelKey(profileId), next);
      return;
    }

    void (async () => {
      const saved = await storage.get(levelKey(profileId));
      if (scope.current !== profileId) return; // hisob almashib ketdi
      setLevelState(findTransparency(saved));
    })();
  }, []);

  const setLevel = useCallback((id: TransparencyLevel) => {
    const next = findTransparency(id);
    setLevelState(next);
    if (scope.current) storage.set(levelKey(scope.current), next);
  }, []);

  const value = useMemo<TransparencyValue>(
    () => ({ level, setLevel, adoptLevel }),
    [level, setLevel, adoptLevel],
  );

  return (
    <TransparencyContext.Provider value={value}>{children}</TransparencyContext.Provider>
  );
};

/**
 * Shaffoflik darajasi. Provider'siz STANDART qaytadi — xato tashlamaydi,
 * chunki mavzu testlarda provider'siz ham quriladi.
 */
export function useTransparency(): TransparencyValue {
  return useContext(TransparencyContext) ?? fallback;
}

const noop = () => undefined;
const fallback: TransparencyValue = {
  level: DEFAULT_TRANSPARENCY,
  setLevel: noop,
  adoptLevel: noop,
};
