import React, { createContext, useState, ReactNode } from 'react';
import { ProfileDTO } from '../types';

interface AuthContextValue {
  profile: ProfileDTO | null;
  setProfile: (p: ProfileDTO | null) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  profile: null,
  setProfile: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  return (
    <AuthContext.Provider value={{ profile, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
