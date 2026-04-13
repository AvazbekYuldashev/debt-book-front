import axios, { AxiosError } from 'axios';
import { API_BASE } from './baseUrl';

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

type ApiErrorBody = {
  message?: string;
  error?: string;
  detail?: string;
  msg?: string;
  errors?: Record<string, string> | string[];
  data?: unknown;
};

function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body) return fallback;
  if (typeof body === 'string') return body || fallback;

  if (typeof body === 'object') {
    const obj = body as Record<string, unknown>;

    const directMessage = [obj.message, obj.error, obj.detail, obj.msg].find(
      (v) => typeof v === 'string' && v
    ) as string | undefined;
    if (directMessage) return directMessage;


    const nestedObject = [obj.message, obj.error, obj.detail, obj.data].find(
      (v) => typeof v === 'object' && v !== null
    ) as Record<string, unknown> | undefined;
    if (nestedObject) {
      const nestedMessage = [nestedObject.message, nestedObject.error, nestedObject.detail, nestedObject.msg].find(
        (v) => typeof v === 'string' && v
      ) as string | undefined;
      if (nestedMessage) return nestedMessage;
    }

    if (Array.isArray(obj.errors)) {
      const firstArrayError = obj.errors.find((v) => typeof v === 'string' && v) as string | undefined;
      if (firstArrayError) return firstArrayError;
      const firstErrorObj = obj.errors.find((v) => typeof v === 'object' && v !== null) as
        | Record<string, unknown>
        | undefined;
      if (firstErrorObj) {
        const firstObjMessage = [firstErrorObj.message, firstErrorObj.error, firstErrorObj.detail, firstErrorObj.msg].find(
          (v) => typeof v === 'string' && v
        ) as string | undefined;
        if (firstObjMessage) return firstObjMessage;
      }
    } else if (obj.errors && typeof obj.errors === 'object' && obj.errors !== null) {
      const firstError = Object.values(obj.errors as Record<string, unknown>).find(
        (v) => typeof v === 'string' && v
      ) as string | undefined;
      if (firstError) return firstError;
    }

    const firstStringValue = Object.values(obj).find((v) => typeof v === 'string' && v) as
      | string
      | undefined;
    if (firstStringValue) return firstStringValue;

    try {
      return JSON.stringify(obj);
    } catch {
      return fallback;
    }
  }

  return fallback;
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

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{
    message?: string;
    error?: string;
    detail?: string;
  }>) => {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const fallback = `Request failed (${status ?? 'unknown'}${statusText ? ` ${statusText}` : ''})`;
    const message = extractErrorMessage(error.response?.data as ApiErrorBody | string | undefined, fallback);
    return Promise.reject(new ApiClientError(message || fallback, status, error.response?.data));
  }
);

export const setApiAuthToken = (token?: string) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete apiClient.defaults.headers.common.Authorization;
};

export default apiClient;
