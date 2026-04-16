import React, { createContext, useCallback, useEffect, useState, ReactNode, SetStateAction } from 'react';
import { ProfileDTO } from '../types';

interface AuthContextValue {
  profile: ProfileDTO | null;
  isAuthReady: boolean;
  setProfile: (p: SetStateAction<ProfileDTO | null>) => void;
}

const AUTH_PROFILE_STORAGE_KEY = 'debt-book.auth.profile';

export const AuthContext = createContext<AuthContextValue>({
  profile: null,
  isAuthReady: false,
  setProfile: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    try {
      const raw = globalThis?.localStorage?.getItem(AUTH_PROFILE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ProfileDTO | null;
      if (parsed && typeof parsed === 'object' && typeof parsed.jwt === 'string' && parsed.jwt) {
        setProfile(parsed);
      }
    } catch {
      // Ignore malformed storage and continue as logged out.
    } finally {
      setIsAuthReady(true);
    }
  }, []);

  const persistProfile = useCallback((nextProfileOrUpdater: SetStateAction<ProfileDTO | null>) => {
    setProfile((prev) => {
      const nextProfile =
        typeof nextProfileOrUpdater === 'function'
          ? (nextProfileOrUpdater as (prevState: ProfileDTO | null) => ProfileDTO | null)(prev)
          : nextProfileOrUpdater;

      try {
        if (nextProfile) {
          globalThis?.localStorage?.setItem(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
        } else {
          globalThis?.localStorage?.removeItem(AUTH_PROFILE_STORAGE_KEY);
        }
      } catch {
        // If persistence fails, keep session in memory.
      }

      return nextProfile;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ profile, isAuthReady, setProfile: persistProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
