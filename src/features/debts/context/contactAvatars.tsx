import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '../../../shared/lib/storage';

// ============================================================
//  Mijoz uchun LOKAL rasm (faqat shu qurilmada/foydalanuvchida).
//  Backend'ga yuborilmaydi -> boshqa foydalanuvchilarda o'zgarmaydi.
//  AsyncStorage'da kalit (partyId/id) -> data-uri ko'rinishida saqlanadi.
// ============================================================
const STORAGE_KEY = 'debt-book.contact-avatars';

interface ContactAvatarsValue {
  avatars: Record<string, string>;
  setAvatar: (key: string, uri: string) => void;
  removeAvatar: (key: string) => void;
}

const ContactAvatarsContext = createContext<ContactAvatarsValue>({
  avatars: {},
  setAvatar: () => {},
  removeAvatar: () => {},
});

export const ContactAvatarsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await storage.get(STORAGE_KEY);
      if (cancelled || !raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') setAvatars(parsed as Record<string, string>);
      } catch {
        // buzilgan ma'lumotni e'tiborsiz qoldiramiz
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setAvatar = useCallback((key: string, uri: string) => {
    if (!key || !uri) return;
    setAvatars((prev) => {
      const next = { ...prev, [key]: uri };
      storage.set(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeAvatar = useCallback((key: string) => {
    setAvatars((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      storage.set(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ avatars, setAvatar, removeAvatar }), [avatars, setAvatar, removeAvatar]);

  return <ContactAvatarsContext.Provider value={value}>{children}</ContactAvatarsContext.Provider>;
};

export const useContactAvatars = (): ContactAvatarsValue => useContext(ContactAvatarsContext);

// Galereyadan rasm tanlab, saqlanadigan uri qaytaradi (web: data-uri, mobil: file uri).
export async function pickContactImage(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.4,
    base64: Platform.OS === 'web',
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset) return null;
  if (asset.uri?.startsWith('data:')) return asset.uri;
  if (asset.base64) return `data:image/jpeg;base64,${asset.base64}`;
  return asset.uri || null;
}
