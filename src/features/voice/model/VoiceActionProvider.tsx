import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { VoiceIntent } from '../api/voice';

export interface VoiceAction {
  /** Qaysi bo'lim gapiryapti. Gap kassada ism boshqa ro'yxatdan qidiriladi. */
  kind: 'TRANSACTION' | 'GAP';
  accountType?: string;
  token?: string;
  onResult: (intent: VoiceIntent) => void;
}

interface VoiceActionValue {
  /** Joriy ekran ovozni qabul qila oladimi va qanday. */
  action: VoiceAction | null;
  register: (action: VoiceAction | null) => void;
}

const VoiceActionContext = createContext<VoiceActionValue>({
  action: null,
  register: () => undefined,
});

/**
 * Ovozli buyruqni QAYSI EKRAN qabul qilishini e'lon qiladi.
 *
 * NEGA KERAK: tugma endi pastki panelning o'rtasida - ya'ni navigatsiya
 * qatlamida, ekranlardan tashqarida. Natijani esa ekranning o'zi qayta
 * ishlaydi: Qarzlarda u oldi-berdi formasini ochadi, Gap kassada esa
 * a'zo tanlanadi. Tugma bilan ekran o'rtasida shu ro'yxat turadi.
 *
 * Yozuv FOKUSGA bog'langan: ekran ko'rinmay qolsa, uning ishlovchisi
 * ham o'chadi. Aks holda Profilda turib gapirilgan buyruq ko'rinmayotgan
 * Qarzlar ekranida forma ochib yuborardi.
 */
export const VoiceActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [action, setAction] = useState<VoiceAction | null>(null);

  const register = useCallback((next: VoiceAction | null) => {
    setAction(next);
  }, []);

  const value = useMemo<VoiceActionValue>(() => ({ action, register }), [action, register]);

  return <VoiceActionContext.Provider value={value}>{children}</VoiceActionContext.Provider>;
};

/** Pastki paneldagi tugma shu orqali joriy ishlovchini oladi. */
export const useVoiceAction = (): VoiceAction | null => useContext(VoiceActionContext).action;

/**
 * Ekran o'z ishlovchisini e'lon qiladi.
 *
 * `action` ni `useMemo` bilan bering: har renderda yangi obyekt kelsa,
 * ro'yxat ham har renderda yangilanib turardi.
 */
export const useRegisterVoiceAction = (action: VoiceAction | null): void => {
  const { register } = useContext(VoiceActionContext);
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused || !action) return undefined;
    register(action);
    return () => register(null);
  }, [focused, action, register]);
};
