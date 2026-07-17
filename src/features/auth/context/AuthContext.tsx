import React, { createContext, useCallback, useEffect, useState, ReactNode, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { ProfileDTO } from '../../../shared/types';
import {
  setUnauthorizedHandler,
  setRefreshTokenGetter,
  setTokenRefreshedHandler,
} from '../../../shared/api/apiClient';
import { secureStorage } from '../../../shared/lib/secureStorage';

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
        const raw = await secureStorage.get(AUTH_PROFILE_STORAGE_KEY);
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

      if (nextProfile) {
        secureStorage.set(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      } else {
        secureStorage.remove(AUTH_PROFILE_STORAGE_KEY);
      }

      return nextProfile;
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      persistProfile(null);
      Alert.alert('Sessiya tugadi', 'Iltimos qayta kiring.');
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [persistProfile]);

  // Interceptor refresh token getter ni ulash
  useEffect(() => {
    setRefreshTokenGetter(() => profile?.refreshToken);
    return () => {
      setRefreshTokenGetter(null);
    };
  }, [profile?.refreshToken]);

  // Yangi tokenlar kelganda profilni yangilash
  useEffect(() => {
    setTokenRefreshedHandler((jwt: string, refreshToken: string) => {
      persistProfile((prev) => prev ? { ...prev, jwt, refreshToken } : prev);
    });
    return () => {
      setTokenRefreshedHandler(null);
    };
  }, [persistProfile]);

  return (
    <AuthContext.Provider value={{ profile, isAuthReady, setProfile: persistProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
