import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE } from './baseUrl';
import { BUSINESS_HEADER_KEY, getActiveBusinessId } from './workspaceHeaders';
import { getApiLanguage } from '../i18n';
import { extractErrorMessage, ApiErrorBody } from '../lib/apiError';
import { networkStatus } from '../lib/networkStatus';
import { outbox, type OutboxMethod } from '../lib/outbox';
import { IDEMPOTENCY_HEADER, newIdempotencyKey } from '../lib/idempotency';

export class ApiClientError extends Error {
  status?: number;
  responseBody?: unknown;

  constructor(message: string, status?: number, responseBody?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

/**
 * Amal SERVERGA YETMADI, lekin YO'QOLMADI — navbatga tushdi.
 *
 * Oddiy tarmoq xatosidan farqi shunda: chaqiruvchi buni muvaffaqiyat
 * deb qabul qilishi mumkin. Ma'lumot qurilmada saqlangan va internet
 * qaytishi bilan o'zi yuboriladi.
 */
export class OfflineQueuedError extends ApiClientError {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineQueuedError';
  }
}

/** Xato "navbatga tushdi" degani emasmi. */
export const isQueuedOffline = (error: unknown): error is OfflineQueuedError =>
  error instanceof OfflineQueuedError;

let unauthorizedHandler: (() => void) | null = null;
let businessAccessDeniedHandler: (() => void) | null = null;
let getRefreshToken: (() => string | undefined) | null = null;
let onTokenRefreshed: ((jwt: string, refreshToken: string) => void) | null = null;

export const BUSINESS_ACCESS_DENIED_MESSAGE = 'Profile does not have access to the requested business';

export function notifyBusinessAccessDeniedIfNeeded(message: string) {
  if (message.includes(BUSINESS_ACCESS_DENIED_MESSAGE)) {
    businessAccessDeniedHandler?.();
  }
}

/** Yozuv metodlari — kalit ham, navbat ham faqat shularga tegishli. */
const WRITE_METHODS: readonly string[] = ['post', 'put', 'patch', 'delete'];

/**
 * POST bilan boradigan, lekin aslida HECH NARSA YOZMAYDIGAN yo'llar.
 *
 * Bu ro'yxatdagilar filtrni tanada yuboradi (shuning uchun GET emas) va
 * server holatini o'zgartirmaydi. Ularga kalit berish ikki tomondan
 * zarar: serverda har o'qish uchun bitta qator qolar, oflaynda esa
 * ma'nosiz so'rov navbatni to'ldirib, ortidagi haqiqiy amallarni
 * kechiktirardi. Keyin baribir qaytadan so'raladi.
 *
 * Fayl yuborish va ovoz ham bu yerda: ularning tanasi JSON emas
 * (`FormData`) yoki bir martalik va navbatda saqlashning ma'nosi yo'q.
 */
const NON_PERSISTING_WRITES: readonly string[] = [
  '/expense/by-category',
  '/expense/sum',
  '/gap/summary',
  '/gap/my',
  '/rental/my',
  '/rental/summary',
  '/voice/stt',
  '/voice/understand',
  '/voice/usage/target',
  '/payment/click/link',
  '/attach/upload',
];

/**
 * Navbatga HECH QACHON tushmaydigan yo'llar — maxfiylik sababli.
 *
 * Navbat diskka JSON bo'lib yoziladi va u shifrlanmagan. Parol yoki
 * bir martalik kod o'sha yerda ochiq yotib qolardi — bu oflayn
 * qulaylikdan beqiyos og'irroq zarar. Bunday amallar oflaynda
 * shunchaki bajarilmaydi: ularni keyinroq qayta kiritish mumkin,
 * ayniqsa kod baribir eskiradi.
 *
 * Kirish va ro'yxatdan o'tishning o'zi bu ro'yxatda yo'q: u `apiClient`
 * dan emas, to'g'ridan-to'g'ri `fetch` bilan boradi va bu qatlamga
 * umuman kirmaydi.
 */
const NEVER_QUEUE: readonly string[] = [
  '/profile/password',
  '/profile/username/confirm',
  '/auth/',
];

/** So'rov holatni O'ZGARTIRADIMI — kalit va navbat shunga qarab beriladi. */
function isPersistingWrite(method: string | undefined, url: string | undefined, body: unknown): boolean {
  if (!method || !url) return false;
  if (!WRITE_METHODS.includes(method.toLowerCase())) return false;
  if (NON_PERSISTING_WRITES.some((path) => url.startsWith(path))) return false;
  if (NEVER_QUEUE.some((path) => url.startsWith(path))) return false;
  // `FormData` ni navbatga saqlab bo'lmaydi: JSON ga aylanmaydi.
  if (typeof FormData !== 'undefined' && body instanceof FormData) return false;
  return true;
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': 'UZ',
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers['Accept-Language'] = getApiLanguage();
  const businessId = getActiveBusinessId();
  if (businessId) {
    config.headers[BUSINESS_HEADER_KEY] = businessId;
  } else if (config.headers && BUSINESS_HEADER_KEY in config.headers) {
    delete config.headers[BUSINESS_HEADER_KEY];
  }

  /*
   * HAR YOZUV AMALIGA "bir amal — bitta yozuv" KALITI.
   *
   * Kalit shu yerda berilgani BEJIZ emas va u interceptor "har
   * urinishda yangi kalit beradi" degan xavfni tug'dirmaydi: axios
   * qayta urinishda (masalan token yangilangandan keyin) AYNI SHU
   * `config` ni qayta ishlatadi, ya'ni sarlavha allaqachon o'rnatilgan
   * bo'ladi va pastdagi shart uni qayta yozmaydi. Oflayn navbat ham
   * kalitni o'zi bilan saqlaydi.
   *
   * Yangi amal esa yangi `config` yaratadi — demak yangi kalit. Ikki
   * marta ataylab kiritilgan bir xil xarajat ikkita bo'lib qoladi,
   * qayta yuborilgan BITTA amal esa bitta bo'lib qoladi. Aynan shu
   * kerak.
   *
   * O'qish so'rovlariga tegilmaydi: ularni qayta yuborishning zarari
   * ham, foydasi ham yo'q.
   */
  if (isPersistingWrite(config.method, config.url, config.data) && !config.headers[IDEMPOTENCY_HEADER]) {
    config.headers[IDEMPOTENCY_HEADER] = newIdempotencyKey();
  }

  return config;
});

let isRefreshing = false;

/**
 * Yangilanish tugashini kutayotgan so'rovlar.
 *
 * Ikkala tomon ham saqlanadi: yangilanish yiqilsa ularni REJECT qilish kerak,
 * aks holda so'rovlar abadiy osilib qoladi va ekran yuklanmay turaveradi.
 */
let refreshQueue: Array<{
  resolve: (jwt: string) => void;
  reject: (reason: unknown) => void;
}> = [];

function flushQueue(jwt: string) {
  const queue = refreshQueue;
  refreshQueue = [];
  queue.forEach(({ resolve }) => resolve(jwt));
}

function rejectQueue(reason: unknown) {
  const queue = refreshQueue;
  refreshQueue = [];
  queue.forEach(({ reject }) => reject(reason));
}

/**
 * "Sessiya tugadi" xabari BIR MARTA chiqishi uchun.
 *
 * Ekran ochilganda o'nlab so'rov parallel ketadi. Token eskirgan bo'lsa
 * hammasi 401 qaytaradi va har biri handler'ni chaqirsa, foydalanuvchi
 * ketma-ket o'nta bir xil oyna ko'radi. Bayroq keyingi muvaffaqiyatli
 * kirishgacha ushlab turadi.
 */
let sessionExpiredNotified = false;

function notifyUnauthorized() {
  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  unauthorizedHandler?.();
}

/** Tarmoqsiz qolgan yozuv amalini navbatga qo'yadi. Qo'yilsa `true`. */
async function maybeQueueOffline(error: AxiosError): Promise<boolean> {
  if (error.response) return false;
  const config = error.config;
  if (!config?.url || !config.method) return false;
  if (!isPersistingWrite(config.method, config.url, config.data)) return false;
  const method = config.method.toLowerCase();

  const headers = (config.headers ?? {}) as Record<string, unknown>;
  const key = headers[IDEMPOTENCY_HEADER];
  if (typeof key !== 'string' || !key) return false;

  await outbox.enqueue({
    method: method.toUpperCase() as OutboxMethod,
    url: config.url,
    body: parseBody(config.data),
    key,
  });
  return true;
}

/** Axios tanani satrga aylantirib yuborgan bo'lishi mumkin. */
function parseBody(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

apiClient.interceptors.response.use(
  (response) => {
    // Server javob berdi => onlaynmiz (UI'dagi oflayn banner yopiladi).
    networkStatus.markOnline();
    return response;
  },
  async (error: AxiosError<{ message?: string; error?: string; detail?: string }>) => {
    const status = error.response?.status;

    // Javobning O'ZI yo'q (timeout / DNS / uzilgan tarmoq) => oflayn.
    // 4xx/5xx bunga kirmaydi: ular serverga yetib borgan, ya'ni aloqa bor.
    if (!error.response) networkStatus.markOffline();
    else networkStatus.markOnline();
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Try token refresh on 401 or 403
    if ((status === 401 || status === 403) && !originalRequest._retry && getRefreshToken) {
      const storedRefreshToken = getRefreshToken();
      if (storedRefreshToken) {
        originalRequest._retry = true;

        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          }).then((jwt) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${jwt}`;
            return apiClient(originalRequest);
          });
        }

        isRefreshing = true;
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken: storedRefreshToken,
          });
          const { jwt, refreshToken: newRefreshToken } = res.data as { jwt: string; refreshToken: string };

          apiClient.defaults.headers.common.Authorization = `Bearer ${jwt}`;
          // Sessiya tiklandi — keyingi muddat tugashida xabar yana chiqsin.
          lastAuthToken = jwt;
          sessionExpiredNotified = false;
          onTokenRefreshed?.(jwt, newRefreshToken);
          flushQueue(jwt);

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${jwt}`;
          return apiClient(originalRequest);
        } catch {
          rejectQueue(error);
          notifyUnauthorized();
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      // Refresh token yo'q — qayta urinishning ma'nosi yo'q, kirish kerak.
      notifyUnauthorized();
    }

    /*
     * TARMOQSIZ QOLGAN YOZUV AMALI NAVBATGA TUSHADI.
     *
     * Shart uchta va uchalasi ham zarur:
     *   - javobning O'ZI yo'q (server rad etgan bo'lsa qayta yuborishning
     *     ma'nosi yo'q);
     *   - bu YOZUV amali (o'qishni navbatga qo'yish befoyda — u keyin
     *     baribir qaytadan so'raladi);
     *   - so'rovda "bir amal, bitta yozuv" KALITI bor. Kalitsiz amalni
     *     qayta yuborish xavfli: server uni yangi amal deb qabul qilib,
     *     masalan pulni ikki marta yozib qo'yishi mumkin.
     */
    const queued = await maybeQueueOffline(error);
    if (queued) {
      return Promise.reject(
        new OfflineQueuedError("Internet yo'q — amal saqlandi va aloqa tiklanganda yuboriladi")
      );
    }

    const statusText = error.response?.statusText;
    const fallback = `Request failed (${status ?? 'unknown'}${statusText ? ` ${statusText}` : ''})`;
    const message = extractErrorMessage(error.response?.data as ApiErrorBody | string | undefined, fallback);
    notifyBusinessAccessDeniedIfNeeded(message);
    return Promise.reject(new ApiClientError(message || fallback, status, error.response?.data));
  }
);

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

export const setBusinessAccessDeniedHandler = (handler: (() => void) | null) => {
  businessAccessDeniedHandler = handler;
};

export const setRefreshTokenGetter = (getter: (() => string | undefined) | null) => {
  getRefreshToken = getter;
};

export const setTokenRefreshedHandler = (handler: ((jwt: string, refreshToken: string) => void) | null) => {
  onTokenRefreshed = handler;
};

/**
 * Oxirgi o'rnatilgan token.
 *
 * `setApiAuthToken` har bir so'rovdan oldin chaqiriladi, shuning uchun
 * "sessiya tugadi" bayrog'ini shunchaki har chaqiruvda tozalab bo'lmaydi —
 * u holda eskirgan token bilan ketgan har bir so'rov yana xabar chiqarardi.
 * Bayroq faqat token HAQIQATAN boshqasiga almashganda tiklanadi: bu yangi
 * kirish yoki muvaffaqiyatli yangilanish degani.
 */
let lastAuthToken: string | undefined;

export const setApiAuthToken = (token?: string) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    if (token !== lastAuthToken) {
      lastAuthToken = token;
      sessionExpiredNotified = false;
    }
    return;
  }
  lastAuthToken = undefined;
  delete apiClient.defaults.headers.common.Authorization;
};

export default apiClient;
