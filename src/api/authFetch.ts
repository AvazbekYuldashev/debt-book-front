import { API_BASE } from './baseUrl';
import { BUSINESS_HEADER_KEY, getBusinessIdFromWorkspaceStorage } from './workspaceHeaders';
import { notifyBusinessAccessDeniedIfNeeded } from './apiClient';

export class ApiFetchError extends Error {
  status: number;
  responseBody: unknown;

  constructor(message: string, status: number, responseBody: unknown) {
    super(message);
    this.name = 'ApiFetchError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

export function getErrorMessage(status: number, statusText: string, body: unknown): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const message = [record.message, record.error, record.detail].find(
      (value) => typeof value === 'string' && value
    );
    if (typeof message === 'string') return message;
  }

  if (typeof body === 'string' && body) return body;
  return `Request failed (${status}${statusText ? ` ${statusText}` : ''})`;
}

export async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function authFetch(path: string, jwt: string, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers || {});
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${jwt}`);
  headers.set('Accept-Language', 'UZ');

  const businessId = getBusinessIdFromWorkspaceStorage();
  if (businessId) {
    headers.set(BUSINESS_HEADER_KEY, businessId);
  } else {
    headers.delete(BUSINESS_HEADER_KEY);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const parsed = await parseResponseBody(res);
  if (!res.ok) {
    const message = getErrorMessage(res.status, res.statusText, parsed);
    notifyBusinessAccessDeniedIfNeeded(message);
    throw new ApiFetchError(message, res.status, parsed);
  }
  return parsed;
}
