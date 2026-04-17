import { API_BASE } from './baseUrl';

export interface ClientDTO {
  id: string;
  name: string;
  phoneNumber: string;
  creditorId?: string;
  debtorId?: string;
}

export interface ClientCreatedDTO {
  name: string;
  phoneNumber: string;
}

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

function getErrorMessage(status: number, statusText: string, body: unknown): string {
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

async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function getMyClients(jwt: string, page = 1, size = 100): Promise<ClientDTO[]> {
  const fetchPage = async (pageNumber: number): Promise<PaginatedResponse<ClientDTO>> => {
    const params = new URLSearchParams({
      page: String(pageNumber),
      size: String(size),
    });

    const res = await fetch(`${API_BASE}/client/my?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${jwt}`,
        'Accept-Language': 'UZ',
      },
    });

    const parsed = await parseResponseBody(res);

    if (!res.ok) {
      throw new Error(getErrorMessage(res.status, res.statusText, parsed));
    }

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
  page = 1,
  size = 100
): Promise<ClientDTO[]> {
  const fetchPage = async (pageNumber: number): Promise<PaginatedResponse<ClientDTO>> => {
    const params = new URLSearchParams({
      page: String(pageNumber),
      size: String(size),
    });

    const res = await fetch(`${API_BASE}/client/filter?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${jwt}`,
        'Accept-Language': 'UZ',
      },
      body: JSON.stringify(dto),
    });

    const parsed = await parseResponseBody(res);

    if (!res.ok) {
      throw new Error(getErrorMessage(res.status, res.statusText, parsed));
    }

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
  const res = await fetch(`${API_BASE}/client`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${jwt}`,
      'Accept-Language': 'UZ',
    },
    body: JSON.stringify(dto),
  });

  const parsed = await parseResponseBody(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(res.status, res.statusText, parsed));
  }

  return parsed as ClientDTO;
}

export async function updateClient(jwt: string, id: string, dto: ClientUpdateDTO): Promise<void> {
  const res = await fetch(`${API_BASE}/client/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${jwt}`,
      'Accept-Language': 'UZ',
    },
    body: JSON.stringify({ ...dto, id }),
  });

  const parsed = await parseResponseBody(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(res.status, res.statusText, parsed));
  }
  return;
}

export async function deleteClient(jwt: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/client/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${jwt}`,
      'Accept-Language': 'UZ',
    },
  });

  const parsed = await parseResponseBody(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(res.status, res.statusText, parsed));
  }
}
