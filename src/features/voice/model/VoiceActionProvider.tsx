import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { VoiceIntent } from '../api/voice';

export interface VoiceAction {
  /**
   * Qaysi bo'lim gapiryapti.
   *
   * Server shunga qarab gapni boshqacha o'qiydi: GAP da ism kassa
   * a'zolari orasidan, TRANSACTION da kontaktlardan qidiriladi, EXPENSE
   * da esa ism umuman kerak emas - summa va kategoriya yetarli.
   */
  kind: 'TRANSACTION' | 'GAP' | 'EXPENSE';
  accountType?: string;
  token?: string;
  onResult: (intent: VoiceIntent) => void;
}

interface VoiceActionValue {
  /** Joriy ekran ovozni qabul qila oladimi va qanday. */
  action: VoiceAction | null;
  /**
   * `null` qabul qilmaydi: ko'r-ko'rona tozalash aynan tab almashish
   * poygasini yaratgan edi. Tozalash faqat `unregister` orqali.
   */
  register: (action: VoiceAction) => void;
  /**
   * Ro'yxatni FAQAT hali shu ishlovchi turgan bo'lsa tozalaydi.
   * Ketayotgan ekran yangi kelgan ekranning ishlovchisini o'chirib
   * yubormasligi uchun (pastdagi `useRegisterVoiceAction` ga qarang).
   */
  unregister: (own: VoiceAction) => void;
}

const VoiceActionContext = createContext<VoiceActionValue>({
  action: null,
  register: () => undefined,
  unregister: () => undefined,
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

  const register = useCallback((next: VoiceAction) => {
    setAction(next);
  }, []);

  // Funksional yangilash: solishtirish JORIY qiymat bilan bo'ladi, effekt
  // yozilgan paytdagi eskirgan nusxa bilan emas.
  const unregister = useCallback((own: VoiceAction) => {
    setAction((cur) => (cur === own ? null : cur));
  }, []);

  const value = useMemo<VoiceActionValue>(
    () => ({ action, register, unregister }),
    [action, register, unregister],
  );

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
  const { register, unregister } = useContext(VoiceActionContext);
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused || !action) return undefined;
    register(action);
    /**
     * Tozalash FAQAT O'ZINIKINI.
     *
     * Ilgari bu yerda `register(null)` edi va Qarzlar -> Gap kassa
     * o'tishida Gap'dagi mikrofon o'chiq qolardi. Tartib shunday:
     * yangi ochilgan Gap ekrani mount paytidayoq fokusda bo'ladi va
     * ishlovchisini yozadi; navigator esa Qarzlarga "blur" ni KEYINGI
     * commit'da yuboradi - Qarzlarning tozalashi shundagina ishlab,
     * Gap'ning yangi ishlovchisini o'chirib yuborardi.
     */
    return () => unregister(action);
  }, [focused, action, register, unregister]);
};
