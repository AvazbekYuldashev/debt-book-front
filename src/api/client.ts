import { ApiFetchError, authFetch } from './authFetch';

import { AccountType, PartyType } from '../types/money';

export interface ClientDTO {
  id: string;
  businessId?: string | null;
  createdByProfileId?: string | null;
  name: string;
  phoneNumber?: string | null;
  creditorType?: PartyType;
  debtorType?: PartyType;
  creditorId?: string;
  debtorId?: string;
  creditorBusinessId?: string;
  debtorBusinessId?: string;
  partyType?: PartyType;
  partyId?: string;
  visible?: boolean;
  createdDate?: string;
}

export interface ClientProfileCreateDTO {
  name: string;
  phoneNumber: string;
  accountType?: AccountType;
}

export interface ClientBusinessCreateDTO {
  name: string;
  targetType: 'BUSINESS_ACCOUNT';
  targetBusinessId: string;
  accountType?: AccountType;
}

export type ClientCreatedDTO = ClientProfileCreateDTO | ClientBusinessCreateDTO;

export interface ClientUpdateDTO {
  id: string;
  name: string;
}

export interface ClientFilterDTO {
  name?: string;
  phoneNumber?: string;
  accountType?: AccountType;
}

type PaginatedResponse<T> = {
  content?: T[];
  items?: T[];
  data?: T[];
  number?: number;
  totalPages?: number;
  last?: boolean;
};

const CLIENT_BASE_PATHS = ['/client', '/core/client'] as const;
interface ClientRequestOptions {
  accountType?: AccountType;
}

function withQuery(path: string, query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.append(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `${path}${path.includes('?') ? '&' : '?'}${queryString}` : path;
}

const DEFAULT_PAGE: PaginatedResponse<ClientDTO> = {
  content: [],
  last: true,
  totalPages: 1,
  number: 0,
};

const isRecoverableError = (error: unknown): boolean =>
  error instanceof ApiFetchError && (error.status === 400 || error.status === 404);

const normalizePage = (parsed: unknown): PaginatedResponse<ClientDTO> => {
  if (Array.isArray(parsed)) {
    return { content: parsed as ClientDTO[], last: true, totalPages: 1, number: 0 };
  }

  if (!parsed || typeof parsed !== 'object') {
    return DEFAULT_PAGE;
  }

  const root = parsed as Record<string, unknown>;
  const node = (root.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>;

  if (Array.isArray(node.content) || Array.isArray(node.items) || Array.isArray(node.data)) {
    return node as PaginatedResponse<ClientDTO>;
  }

  if (Array.isArray(root.data)) {
    return { content: root.data as ClientDTO[], last: true, totalPages: 1, number: 0 };
  }

  return DEFAULT_PAGE;
};

async function fetchClientsPage(
  jwt: string,
  pageNumber: number,
  size: number,
  options?: ClientRequestOptions
): Promise<PaginatedResponse<ClientDTO>> {
  let lastError: unknown;

  for (const base of CLIENT_BASE_PATHS) {
    const attempts = [
      withQuery(`${base}/my`, { page: pageNumber, size, accountType: options?.accountType }),
      withQuery(`${base}/my`, { accountType: options?.accountType }),
    ];

    for (const path of attempts) {
      try {
        const parsed = await authFetch(path, jwt, { method: 'GET' });
        return normalizePage(parsed);
      } catch (e) {
        lastError = e;
        if (!isRecoverableError(e)) throw e;
      }
    }
  }

  throw lastError;
}

async function fetchFilteredClientsPage(
  jwt: string,
  dto: ClientFilterDTO,
  pageNumber: number,
  size: number,
  options?: ClientRequestOptions
): Promise<PaginatedResponse<ClientDTO>> {
  let lastError: unknown;

  for (const base of CLIENT_BASE_PATHS) {
    const attempts = [
      withQuery(`${base}/filter`, { page: pageNumber, size, accountType: options?.accountType }),
      withQuery(`${base}/filter`, { accountType: options?.accountType }),
    ];

    for (const path of attempts) {
      try {
        const parsed = await authFetch(path, jwt, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dto),
        });
        return normalizePage(parsed);
      } catch (e) {
        lastError = e;
        if (!isRecoverableError(e)) throw e;
      }
    }
  }

  throw lastError;
}

export async function getMyClients(jwt: string, page = 0, size = 100, options?: ClientRequestOptions): Promise<ClientDTO[]> {
  const firstPage = await fetchClientsPage(jwt, page, size, options);
  const all = [...(firstPage.content || firstPage.items || firstPage.data || [])];
  const totalPages =
    typeof firstPage.totalPages === 'number' && firstPage.totalPages > 0 ? firstPage.totalPages : 1;

  if (totalPages <= 1 || firstPage.last) {
    return all;
  }

  for (let pageNumber = page + 1; pageNumber <= totalPages; pageNumber += 1) {
    const nextPage = await fetchClientsPage(jwt, pageNumber, size, options);
    const batch = nextPage.content || nextPage.items || nextPage.data || [];
    all.push(...batch);
    if (nextPage.last) break;
  }

  return all;
}

export async function filterClients(
  jwt: string,
  dto: ClientFilterDTO,
  page = 0,
  size = 100,
  options?: ClientRequestOptions
): Promise<ClientDTO[]> {
  const firstPage = await fetchFilteredClientsPage(jwt, dto, page, size, options);
  const all = [...(firstPage.content || firstPage.items || firstPage.data || [])];
  const totalPages =
    typeof firstPage.totalPages === 'number' && firstPage.totalPages > 0 ? firstPage.totalPages : 1;

  if (totalPages <= 1 || firstPage.last) {
    return all;
  }

  for (let pageNumber = page + 1; pageNumber <= totalPages; pageNumber += 1) {
    const nextPage = await fetchFilteredClientsPage(jwt, dto, pageNumber, size, options);
    const batch = nextPage.content || nextPage.items || nextPage.data || [];
    all.push(...batch);
    if (nextPage.last) break;
  }

  return all;
}

export async function createClient(jwt: string, dto: ClientCreatedDTO, options?: ClientRequestOptions): Promise<ClientDTO> {
  let lastError: unknown;

  for (const base of CLIENT_BASE_PATHS) {
    try {
      const parsed = await authFetch(withQuery(base, { accountType: options?.accountType }), jwt, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      });

      if (parsed && typeof parsed === 'object' && 'data' in (parsed as Record<string, unknown>)) {
        const data = (parsed as { data?: ClientDTO }).data;
        if (data) return data;
      }

      return parsed as ClientDTO;
    } catch (e) {
      lastError = e;
      if (!isRecoverableError(e)) throw e;
    }
  }

  throw lastError;
}

export async function updateClient(
  jwt: string,
  id: string,
  dto: ClientUpdateDTO,
  options?: ClientRequestOptions
): Promise<void> {
  let lastError: unknown;
  for (const base of CLIENT_BASE_PATHS) {
    try {
      await authFetch(withQuery(`${base}/`, { accountType: options?.accountType }), jwt, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...dto, id }),
      });
      return;
    } catch (e) {
      lastError = e;
      if (!isRecoverableError(e)) throw e;
    }
  }
  throw lastError;
}

export async function deleteClient(jwt: string, id: string, options?: ClientRequestOptions): Promise<void> {
  let lastError: unknown;
  for (const base of CLIENT_BASE_PATHS) {
    try {
      await authFetch(withQuery(`${base}/${id}`, { accountType: options?.accountType }), jwt, {
        method: 'DELETE',
      });
      return;
    } catch (e) {
      lastError = e;
      if (!isRecoverableError(e)) throw e;
    }
  }
  throw lastError;
}
