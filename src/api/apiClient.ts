import axios, { AxiosError } from 'axios';
import { API_BASE } from './baseUrl';
import { BUSINESS_HEADER_KEY, getActiveBusinessId } from './workspaceHeaders';
import { getApiLanguage } from '../i18n';
import { extractErrorMessage, ApiErrorBody } from '../utils/apiError';

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

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{
    message?: string;
    error?: string;
    detail?: string;
  }>) => {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    if (status === 401) {
      unauthorizedHandler?.();
    }
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

export const setApiAuthToken = (token?: string) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete apiClient.defaults.headers.common.Authorization;
};

export default apiClient;
