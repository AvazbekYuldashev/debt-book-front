import { ProfileDTO } from '../types';
import { API_BASE } from './baseUrl';

type ApiErrorBody = {
  message?: string;
  error?: string;
  errors?: Record<string, string>;
};

function normalizeUsername(value: string): string {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, '');

  // If user entered phone-like username, auto-prepend Uzbekistan country code.
  if (digits.length === 9) return `998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return digits;

  return raw;
}

export class ApiRequestError extends Error {
  status: number;
  responseBody: unknown;

  constructor(message: string, status: number, responseBody: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

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

async function request<T>(path: string, dto: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Language': 'UZ',
    },
    body: JSON.stringify(dto),
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const body = (parsed || null) as ApiErrorBody | string | null;
    const fallback = `Request failed (${res.status}${res.statusText ? ` ${res.statusText}` : ''})`;
    throw new ApiRequestError(extractErrorMessage(body, fallback), res.status, body);
  }

  return parsed as T;
}

export async function register(dto: {
    name: string;
    surname: string;
    username: string;
    password: string
    }) {
  return request<string | { message?: string }>('/auth/registration', {
    ...dto,
    username: normalizeUsername(dto.username),
  });
}

export async function login(dto: { username: string; password: string }) {
  return request<ProfileDTO>('/auth/login', {
    ...dto,
    username: normalizeUsername(dto.username),
  });
}

export async function verifySms(dto: { phone: string; code: string }) {
  return request<ProfileDTO>('/auth/registration/sms-verification', {
    ...dto,
    phone: normalizeUsername(dto.phone),
  });
}

export async function resendSms(dto: { phone: string }) {
  return request<string>('/auth/registration/sms-verification-resend', {
    ...dto,
    phone: normalizeUsername(dto.phone),
  });
}

export async function resetPassword(dto: { username: string }) {
  return request<string>('/auth/reset-password', {
    ...dto,
    username: normalizeUsername(dto.username),
  });
}

export async function confirmReset(dto: { username: string; confirmCode: string; password: string }) {
  return request<string>('/auth/reset-password-confrim', {
    ...dto,
    username: normalizeUsername(dto.username),
  });
}
