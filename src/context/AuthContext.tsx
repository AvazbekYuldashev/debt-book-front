import React, { createContext, useCallback, useEffect, useState, ReactNode, SetStateAction } from 'react';
import { ProfileDTO } from '../types';
import { setUnauthorizedHandler } from '../api/apiClient';
import { storage } from '../utils/storage';

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
    let cancelled = false;
    (async () => {
      try {
        const raw = await storage.get(AUTH_PROFILE_STORAGE_KEY);
        if (!raw || cancelled) return;
        const parsed = JSON.parse(raw) as ProfileDTO | null;
        if (parsed && typeof parsed === 'object' && typeof parsed.jwt === 'string' && parsed.jwt) {
          setProfile(parsed);
        }
      } catch {
        // Ignore malformed storage and continue as logged out.
      } finally {
        if (!cancelled) setIsAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistProfile = useCallback((nextProfileOrUpdater: SetStateAction<ProfileDTO | null>) => {
    setProfile((prev) => {
      const nextProfile =
        typeof nextProfileOrUpdater === 'function'
          ? (nextProfileOrUpdater as (prevState: ProfileDTO | null) => ProfileDTO | null)(prev)
          : nextProfileOrUpdater;

      // fire-and-forget (cross-platform AsyncStorage)
      if (nextProfile) {
        storage.set(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      } else {
        storage.remove(AUTH_PROFILE_STORAGE_KEY);
      }

      return nextProfile;
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      persistProfile(null);
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [persistProfile]);

  return (
    <AuthContext.Provider value={{ profile, isAuthReady, setProfile: persistProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
