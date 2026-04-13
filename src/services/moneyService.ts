import apiClient, { ApiClientError, setApiAuthToken } from '../api/apiClient';
import {
  AppResponse,
  MoneyCreditorCreatedDTO,
  MoneyDebtorCreatedDTO,
  MoneyPriceDTO,
  MoneyResponseDTO,
  PageResponse,
} from '../types/money';
import { normalizeMoney, normalizeMoneyPage } from '../utils/money';

const BASE_PATHS = ['/core/debt'] as const;

async function postWithFallback<T>(path: string, data: unknown): Promise<T> {
  let lastError: unknown;

  for (const base of BASE_PATHS) {
    try {
      const response = await apiClient.post<T>(`${base}${path}`, data);
      return response.data;
    } catch (e) {
      lastError = e;
      if (!(e instanceof ApiClientError) || e.status !== 404) {
        throw e;
      }
    }
  }

  throw lastError;
}

async function getWithFallback<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  let lastError: unknown;

  for (const base of BASE_PATHS) {
    try {
      const response = await apiClient.get<T>(`${base}${path}`, { params });
      return response.data;
    } catch (e) {
      lastError = e;
      if (!(e instanceof ApiClientError) || e.status !== 404) {
        throw e;
      }
    }
  }

  throw lastError;
}

async function getWithMultiplePathsFallback<T>(
  paths: Array<{ path: string; params?: Record<string, unknown> }>
): Promise<T> {
  let lastError: unknown;

  for (const item of paths) {
    try {
      const response = await getWithFallback<T>(item.path, item.params);
      return response;
    } catch (e) {
      lastError = e;
      if (!(e instanceof ApiClientError) || (e.status !== 404 && e.status !== 400)) {
        throw e;
      }
    }
  }

  throw lastError;
}

export interface GetMoneyHistoryParams {
  page?: number;
  size?: number;
  id: string;
  token?: string;
}

export const createCredit = async (
  dto: MoneyCreditorCreatedDTO,
  token?: string
): Promise<MoneyResponseDTO> => {
  setApiAuthToken(token);
  const response = await postWithFallback<Omit<MoneyResponseDTO, 'amount'> & { amount: number | string }>(
    '/take',
    dto
  );
  return normalizeMoney(response);
};

export const createDebt = async (
  dto: MoneyDebtorCreatedDTO,
  token?: string
): Promise<MoneyResponseDTO> => {
  setApiAuthToken(token);
  const response = await postWithFallback<Omit<MoneyResponseDTO, 'amount'> & { amount: number | string }>(
    '/give',
    dto
  );
  return normalizeMoney(response);
};

export const getMoneyHistory = async ({
  page = 1,
  size = 15,
  id,
  token,
}: GetMoneyHistoryParams): Promise<PageResponse<MoneyResponseDTO>> => {
  setApiAuthToken(token);
  const response = await getWithMultiplePathsFallback<
    PageResponse<Omit<MoneyResponseDTO, 'amount'> & { amount: number | string }>
  >([{ path: '/history', params: { page, size, id } }]);
  return normalizeMoneyPage(response);
};

export const getAllTotalPrice = async (token?: string): Promise<MoneyPriceDTO> => {
  setApiAuthToken(token);
  const response = await getWithFallback<AppResponse<MoneyPriceDTO>>('/tootal-price');
  return response.data;
};

export const getTotalPriceByCreditorId = async (id: string, token?: string): Promise<MoneyPriceDTO> => {
  setApiAuthToken(token);
  const response = await getWithFallback<AppResponse<MoneyPriceDTO>>(`/tootal-price/${id}`);
  return response.data;
};
