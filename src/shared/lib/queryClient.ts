import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { networkStatus } from './networkStatus';

// ============================================================
//  OFLAYN ISHLASH POYDEVORI.
//
//  Uch qism bir-biriga bog'langan:
//    1) server javoblari QURILMAGA saqlanadi — ilova tarmoqsiz ochilsa
//       ham oxirgi ko'rilgan ro'yxatlar chiqadi;
//    2) React Query ning tarmoq holati bizning `networkStatus` ga
//       ulanadi — oflaynda so'rovlar yiqilmaydi, TO'XTAB turadi;
//    3) tarmoq qaytganda o'sha to'xtagan ishlar o'zidan-o'zi davom
//       etadi.
//
//  `QueryClient` shu yerda, App.tsx da emas: uni autentifikatsiya
//  qatlami ham ko'rishi kerak (hisob almashganda kesh tozalanadi), u
//  esa provayderlar daraxtida boshqa joyda turadi.
// ============================================================

/**
 * Saqlangan kesh QANCHA vaqt yaroqli.
 *
 * Bu "ma'lumot eskirdi" emas, "umuman ko'rsatsa bo'ladimi" chegarasi:
 * eskirgan ma'lumot baribir darhol ko'rsatiladi va fonda yangilanadi.
 * Bir hafta — odam ta'tilda bo'lsa ham hisobini ocha olishi uchun.
 */
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const CACHE_KEY = 'debt-book.query-cache';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      /**
       * `cacheTime` MAX_AGE ga teng: odatiy 5 daqiqa bo'lsa, ilova
       * yopilishidan oldin yozuvlar xotiradan o'chib ketar va diskka
       * saqlanadigan narsa qolmasdi.
       */
      cacheTime: CACHE_MAX_AGE,
    },
    /**
     * YOZUV amallari hozircha AVVALGIDEK: oflaynda to'xtamaydi, darhol
     * xato beradi.
     *
     * Odatiy `networkMode: 'online'` bilan ular to'xtagan holatda
     * osilib qolardi — odam "saqlash" bosib, cheksiz aylanani ko'rib
     * turardi va amal qayerga ketganini bilmasdi. To'xtash FOYDALI
     * bo'lishi uchun avval navbat kerak: saqlangan mutatsiyalar,
     * "yuborilmagan" belgisi va takrorlanishdan himoya (server
     * tomonda idempotency kaliti).
     *
     * Shu qism tayyor bo'lganda bu qator olib tashlanadi — o'shanda
     * oflayn amal to'xtaydi, saqlanadi va tarmoq qaytganda o'zi
     * yuboriladi.
     */
    mutations: {
      networkMode: 'always',
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_KEY,
  // Har o'zgarishda diskka yozmaydi: ro'yxat suriladigan paytda bu
  // sezilarli ish bo'lardi.
  throttleTime: 2_000,
});

/**
 * Saqlangan keshni butunlay o'chiradi.
 *
 * Hisob almashganda SHART: aks holda yangi kirgan odam bir lahza
 * oldingi hisobning kontaktlari va balanslarini ko'rib qolardi.
 */
export const clearPersistedCache = async (): Promise<void> => {
  queryClient.clear();
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // Diskdan o'chmasa ham xotira tozalandi — keyingi yozuv ustiga yozadi.
  }
};

/**
 * React Query ning tarmoq holatini bizning manbaga ulaydi.
 *
 * Buning ikki ta'siri bor va ikkalasi ham oflayn rejim uchun asos:
 *   - oflaynda so'rovlar yiqilmaydi, `paused` holatiga o'tadi va
 *     keshdagi ma'lumot ekranda qoladi;
 *   - tarmoq qaytganda to'xtagan so'rovlar VA to'xtagan mutatsiyalar
 *     avtomatik davom etadi. Oflaynda qilingan amallarni serverga
 *     yuborish aynan shu mexanizm ustiga quriladi.
 */
export const connectOnlineManager = (): void => {
  onlineManager.setEventListener((setOnline) => {
    setOnline(networkStatus.isOnline());
    return networkStatus.subscribe(() => setOnline(networkStatus.isOnline()));
  });
};
