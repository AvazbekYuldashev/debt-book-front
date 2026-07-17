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
let refreshQueue: Array<(jwt: string) => void> = [];

function flushQueue(jwt: string) {
  refreshQueue.forEach((cb) => cb(jwt));
  refreshQueue = [];
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
          return new Promise<string>((resolve) => {
            refreshQueue.push(resolve);
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
          onTokenRefreshed?.(jwt, newRefreshToken);
          flushQueue(jwt);

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${jwt}`;
          return apiClient(originalRequest);
        } catch {
          refreshQueue = [];
          unauthorizedHandler?.();
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      unauthorizedHandler?.();
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

export const setApiAuthToken = (token?: string) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete apiClient.defaults.headers.common.Authorization;
};

export default apiClient;
