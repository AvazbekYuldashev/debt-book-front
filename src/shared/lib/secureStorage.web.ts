import { storage } from './storage';

// ============================================================
//  Web uchun saqlash. Brauzerda Keystore/Keychain yo'q, shuning uchun
//  AsyncStorage (localStorage) ishlatamiz. Bu fayl expo-secure-store'ni
//  IMPORT QILMAYDI — web bundle native modulга bog'lanmaydi.
//  (Bundler `.web.ts` ni `.ts` dan ustun ko'radi.)
// ============================================================
export const secureStorage = {
  get: (key: string): Promise<string | null> => storage.get(key),
  set: (key: string, value: string): Promise<void> => storage.set(key, value),
  remove: (key: string): Promise<void> => storage.remove(key),
};
