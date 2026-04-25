import { authFetch } from './authFetch';

import { PartyType } from '../types/money';

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
  visible?: boolean;
  createdDate?: string;
}

export interface ClientProfileCreateDTO {
  name: string;
  phoneNumber: string;
}

export interface ClientBusinessCreateDTO {
  name: string;
  targetType: 'BUSINESS_ACCOUNT';
  targetBusinessId: string;
}

export type ClientCreatedDTO = ClientProfileCreateDTO | ClientBusinessCreateDTO;

export interface ClientUpdateDTO {
  id: string;
  name: string;
}

export interface ClientFilterDTO {
  name?: string;
  phoneNumber?: string;
}

type PaginatedResponse<T> = {
  content?: T[];
  items?: T[];
  data?: T[];
  number?: number;
  totalPages?: number;
  last?: boolean;
};

export async function getMyClients(jwt: string, page = 0, size = 100): Promise<ClientDTO[]> {
  const fetchPage = async (pageNumber: number): Promise<PaginatedResponse<ClientDTO>> => {
    const params = new URLSearchParams({
      page: String(pageNumber),
      size: String(size),
    });

    const parsed = await authFetch(`/client/my?${params.toString()}`, jwt, { method: 'GET' });

    if (Array.isArray(parsed)) {
      return { content: parsed as ClientDTO[], last: true, totalPages: 1, number: 0 };
    }

    if (parsed && typeof parsed === 'object') {
      return parsed as PaginatedResponse<ClientDTO>;
    }

    return { content: [], last: true, totalPages: 1, number: 0 };
  };

  const firstPage = await fetchPage(page);
  const all = [...(firstPage.content || firstPage.items || firstPage.data || [])];
  const totalPages =
    typeof firstPage.totalPages === 'number' && firstPage.totalPages > 0 ? firstPage.totalPages : 1;

  if (totalPages <= 1 || firstPage.last) {
    return all;
  }

  for (let pageNumber = page + 1; pageNumber <= totalPages; pageNumber += 1) {
    const nextPage = await fetchPage(pageNumber);
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
  size = 100
): Promise<ClientDTO[]> {
  const fetchPage = async (pageNumber: number): Promise<PaginatedResponse<ClientDTO>> => {
    const params = new URLSearchParams({
      page: String(pageNumber),
      size: String(size),
    });

    const parsed = await authFetch(`/client/filter?${params.toString()}`, jwt, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    });

    if (Array.isArray(parsed)) {
      return { content: parsed as ClientDTO[], last: true, totalPages: 1, number: 0 };
    }

    if (parsed && typeof parsed === 'object') {
      return parsed as PaginatedResponse<ClientDTO>;
    }

    return { content: [], last: true, totalPages: 1, number: 0 };
  };

  const firstPage = await fetchPage(page);
  const all = [...(firstPage.content || firstPage.items || firstPage.data || [])];
  const totalPages =
    typeof firstPage.totalPages === 'number' && firstPage.totalPages > 0 ? firstPage.totalPages : 1;

  if (totalPages <= 1 || firstPage.last) {
    return all;
  }

  for (let pageNumber = page + 1; pageNumber <= totalPages; pageNumber += 1) {
    const nextPage = await fetchPage(pageNumber);
    const batch = nextPage.content || nextPage.items || nextPage.data || [];
    all.push(...batch);
    if (nextPage.last) break;
  }

  return all;
}

export async function createClient(jwt: string, dto: ClientCreatedDTO): Promise<ClientDTO> {
  const parsed = await authFetch('/client', jwt, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dto),
  });

  return parsed as ClientDTO;
}

export async function updateClient(jwt: string, id: string, dto: ClientUpdateDTO): Promise<void> {
  await authFetch('/client/', jwt, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...dto, id }),
  });
}

export async function deleteClient(jwt: string, id: string): Promise<void> {
  await authFetch(`/client/${id}`, jwt, {
    method: 'DELETE',
  });
}
