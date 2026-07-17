import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
//  Cross-platform saqlash (web + Android + iOS).
//  AsyncStorage web'da localStorage'ga, mobil'da native storage'ga yozadi.
//  localStorage to'g'ridan-to'g'ri ISHLATILMASIN — Android'da yo'q.
// ============================================================
export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // saqlab bo'lmasa, xotirada qoladi
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // e'tiborsiz
    }
  },
};
