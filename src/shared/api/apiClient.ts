import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE } from './baseUrl';
import { BUSINESS_HEADER_KEY, getActiveBusinessId } from './workspaceHeaders';
import { getApiLanguage } from '../i18n';
import { extractErrorMessage, ApiErrorBody } from '../lib/apiError';

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

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; error?: string; detail?: string }>) => {
    const status = error.response?.status;
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
