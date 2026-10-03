import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { storage } from '../lib/storage';
import {
  backgroundKey,
  DEFAULT_BACKGROUND,
  fromRemote,
  parseBackground,
  serializeBackground,
  type BackgroundFit,
  type BackgroundSettings,
} from './backgroundSettings';

export interface BackgroundValue extends BackgroundSettings {
  /** Yangi rasm tanlandi (attach id). */
  setImage: (imageId: string) => void;
  /** Rasmni olib tashlash — bezakli SVG fonga qaytadi. */
  clearImage: () => void;
  setFit: (fit: BackgroundFit) => void;
  setDim: (dim: number) => void;
  /**
   * Hisob almashganda chaqiriladi: kimning foni ko'rsatilishini belgilaydi.
   *
   * `remote` — serverdan kelgan sozlama (hisobdagi haqiqiy qiymat).
   * `null` profil — chiqib ketildi, standart fonga qaytamiz.
   */
  adopt: (profileId: string | null, remote: unknown) => void;
}

const BackgroundContext = createContext<BackgroundValue | undefined>(undefined);

/**
 * Foydalanuvchi foni holati.
 *
 * SOZLAMA HISOBDA TURADI, qurilmada emas. Ilgari u bitta umumiy kalit
 * ostida telefonning o'zida saqlanardi va uch joyda yo'qolardi: boshqa
 * qurilmadan kirilganda, ilova qayta o'rnatilganda, va bitta telefonda
 * ikkinchi hisob birinchisining fonini ko'rganda.
 *
 * Qurilmadagi nusxa saqlanib qoldi, lekin endi HAR HISOB UCHUN ALOHIDA
 * kalit bilan va faqat TEZ CHIZISH uchun: server javobi kelguncha fon
 * darhol ko'rinadi. Haqiqiy manba — server.
 *
 * Render TO'XTATILMAYDI: fon rasmi kech kelsa "miltillash" bo'lmaydi, u
 * shunchaki bir lahzadan keyin paydo bo'ladi. Ilovani kutishga majburlash
 * esa ochilishni sekinlashtirardi.
 */
export const BackgroundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_BACKGROUND);

  // Kimning foni ko'rsatilyapti. Saqlashda shu kalit ishlatiladi, shuning
  // uchun ref: eskirgan qiymat boshqa hisobning nusxasiga yozib yuborardi.
  const scope = useRef<string | null>(null);

  const adopt = useCallback((profileId: string | null, remote: unknown) => {
    scope.current = profileId;

    if (!profileId) {
      setSettings(DEFAULT_BACKGROUND);
      return;
    }

    // Server javobi bo'lsa u YUTADI va qurilmadagi nusxa yangilanadi.
    if (remote !== undefined && remote !== null) {
      const next = fromRemote(remote);
      setSettings(next);
      storage.set(backgroundKey(profileId), serializeBackground(next));
      return;
    }

    // Javob hali yo'q: shu hisobning oxirgi ko'rinishini chizib turamiz.
    void (async () => {
      const saved = await storage.get(backgroundKey(profileId));
      if (scope.current !== profileId) return; // hisob almashib ketdi
      setSettings(saved ? parseBackground(saved) : DEFAULT_BACKGROUND);
    })();
  }, []);

  // Har o'zgarishda qurilmaga saqlash (fire-and-forget). Serverga yuborish
  // BackgroundPicker zimmasida: token o'sha yerda bor va xato o'sha yerda
  // ko'rsatiladi.
  const update = useCallback((patch: Partial<BackgroundSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      if (scope.current) {
        storage.set(backgroundKey(scope.current), serializeBackground(next));
      }
      return next;
    });
  }, []);

  const value = useMemo<BackgroundValue>(() => ({
    ...settings,
    setImage: (imageId: string) => update({ imageId: imageId.trim() }),
    clearImage: () => update({ imageId: '' }),
    setFit: (fit: BackgroundFit) => update({ fit }),
    setDim: (dim: number) => update({ dim }),
    adopt,
  }), [settings, update, adopt]);

  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
};

/**
 * Fon sozlamasi. Provider'siz ishlatilsa STANDART qiymat qaytadi — xato
 * tashlamaydi, chunki AmbientBackground testlarda provider'siz ham
 * render qilinadi va u yerda fon rasmi shunchaki yo'q bo'lishi to'g'ri.
 */
export function useBackground(): BackgroundValue {
  const context = useContext(BackgroundContext);
  return context ?? fallbackValue;
}

const noop = () => undefined;
const fallbackValue: BackgroundValue = {
  ...DEFAULT_BACKGROUND,
  setImage: noop,
  clearImage: noop,
  setFit: noop,
  setDim: noop,
  adopt: noop,
};
