/* eslint-disable no-undef */
// Test muhiti uchun native modul mock'lari (komponent/context testlari shularsiz yiqiladi).

// AsyncStorage — rasmiy jest-mock'i.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-secure-store (native) — xotirada saqlovchi soxta implementatsiya.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => {
      store.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => {
      store.delete(k);
    }),
  };
});

// expo-crypto — PIN xeshlash testlari uchun. Determinastik soxta xesh
// (haqiqiy SHA-256 shart emas: bir xil kirish -> bir xil chiqish yetarli).
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  // Determinastik, lekin kirishni QAYTARMAYDIGAN soxta digest (haqiqiy
  // SHA-256 kabi: PIN xeshdan ko'rinib qolmasin).
  digestStringAsync: jest.fn(async (_algo, data) => {
    let h = 0;
    for (let i = 0; i < data.length; i += 1) h = (h * 31 + data.charCodeAt(i)) >>> 0;
    return h.toString(16).padStart(8, '0');
  }),
  getRandomBytes: jest.fn((n) => Uint8Array.from({ length: n }, (_, i) => (i * 7) % 256)),
}));

// expo-image-picker — ProfileScreen testlari uchun.
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));
