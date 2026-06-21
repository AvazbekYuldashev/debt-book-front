import * as SecureStore from 'expo-secure-store';

// ============================================================
//  Native (Android/iOS) uchun XAVFSIZ saqlash.
//  Token Android Keystore / iOS Keychain orqali SHIFRLANGAN holda saqlanadi
//  (oddiy AsyncStorage'dan farqli — OWASP Mobile M9 talabini yopadi).
//
//  Web uchun alohida `secureStorage.web.ts` ishlatiladi (AsyncStorage),
//  shuning uchun web bundle'ga expo-secure-store umuman kirmaydi.
// ============================================================

// SecureStore kalitlari faqat [A-Za-z0-9._-] belgilarini qabul qiladi.
const sanitizeKey = (key: string): string => key.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(sanitizeKey(key));
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(sanitizeKey(key), value);
    } catch {
      // shifrlab saqlab bo'lmasa, jim qolamiz (sessiya xotirada davom etadi)
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(sanitizeKey(key));
    } catch {
      // e'tiborsiz
    }
  },
};
