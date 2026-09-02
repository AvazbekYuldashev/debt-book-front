import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { checkPin, clearPin, hasPin, savePin } from './pinStorage';

/**
 * unset    — PIN hali yaratilmagan (birinchi kirish) -> yaratish oynasi.
 * locked   — PIN bor, lekin hali kiritilmagan -> kirish oynasi.
 * unlocked — kirilgan, ilova ochiq.
 * loading  — qurilmadan holat o'qilyapti.
 */
export type PinStatus = 'loading' | 'unset' | 'locked' | 'unlocked';

interface PinContextValue {
  status: PinStatus;
  /** Yangi PIN yaratadi va ilovani ochadi. */
  setupPin: (pin: string) => Promise<void>;
  /** Kiritilgan PIN'ni tekshiradi; to'g'ri bo'lsa ochadi. */
  unlock: (pin: string) => Promise<boolean>;
  /** Ilovani darhol qulflaydi (masalan "qulflash" tugmasi). */
  lock: () => void;
}

export const PinContext = createContext<PinContextValue>({
  status: 'loading',
  setupPin: async () => {},
  unlock: async () => false,
  lock: () => {},
});

// Ilova fonda shuncha vaqtdan ko'p tursa, qaytганda PIN qayta so'raladi.
// Qisqa uzilishlar (bildirishnoma, rasm tanlash) uchun qulf ochiq qoladi.
const LOCK_AFTER_BACKGROUND_MS = 15_000;

export const PinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useContext(AuthContext);
  const [status, setStatus] = useState<PinStatus>('loading');

  // Qurilmadan boshlang'ich holatni o'qiymiz: PIN bormi?
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const exists = await hasPin();
      if (!cancelled) setStatus(exists ? 'locked' : 'unset');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Chiqishda (profil null bo'lganda) PIN o'chiriladi: keyingi foydalanuvchi
  // o'zinikini yaratadi. Faqat set->null o'tishida — ilova ochilishidagi
  // null->restore holatida emas.
  const hadProfile = useRef(false);
  useEffect(() => {
    if (profile) {
      hadProfile.current = true;
      return;
    }
    if (hadProfile.current) {
      hadProfile.current = false;
      clearPin().finally(() => setStatus('unset'));
    }
  }, [profile]);

  // Ilova fonga o'tib qaytganda qayta qulflaymiz (native: AppState, web: visibility).
  const backgroundedAt = useRef<number | null>(null);
  useEffect(() => {
    const onHidden = () => {
      backgroundedAt.current = Date.now();
    };
    const onVisible = () => {
      const since = backgroundedAt.current;
      backgroundedAt.current = null;
      if (since && Date.now() - since >= LOCK_AFTER_BACKGROUND_MS) {
        // Faqat PIN o'rnatilgan va ochiq bo'lsa qulflaymiz.
        setStatus((prev) => (prev === 'unlocked' ? 'locked' : prev));
      }
    };

    if (Platform.OS === 'web') {
      const handler = () => (document.visibilityState === 'hidden' ? onHidden() : onVisible());
      document.addEventListener('visibilitychange', handler);
      return () => document.removeEventListener('visibilitychange', handler);
    }

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') onVisible();
      else if (state === 'background') onHidden();
    });
    return () => sub.remove();
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    await savePin(pin);
    setStatus('unlocked');
  }, []);

  const unlock = useCallback(async (pin: string) => {
    const ok = await checkPin(pin);
    if (ok) setStatus('unlocked');
    return ok;
  }, []);

  const lock = useCallback(() => {
    setStatus((prev) => (prev === 'unlocked' ? 'locked' : prev));
  }, []);

  return (
    <PinContext.Provider value={{ status, setupPin, unlock, lock }}>
      {children}
    </PinContext.Provider>
  );
};

export function useAppPin(): PinContextValue {
  return useContext(PinContext);
}
