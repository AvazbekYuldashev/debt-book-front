import apiClient, { ApiClientError, setApiAuthToken } from '../api/apiClient';
import {
  AccountType,
  AppResponse,
  MoneyCreditorCreatedDTO,
  MoneyDebtorCreatedDTO,
  PartyType,
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
  partyType: PartyType;
  token?: string;
  accountType?: AccountType;
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
  page = 0,
  size = 15,
  id,
  partyType,
  token,
  accountType,
}: GetMoneyHistoryParams): Promise<PageResponse<MoneyResponseDTO>> => {
  setApiAuthToken(token);
  try {
    const response = await getWithMultiplePathsFallback<
      PageResponse<Omit<MoneyResponseDTO, 'amount'> & { amount: number | string }>
    >([{ path: '/history', params: { page, size, id, partyType, accountType } }]);
    return normalizeMoneyPage(response);
  } catch (e) {
    // 404 = bu kontakt bilan hali aloqa yo'q. Xato tashlamay bo'sh sahifa qaytaramiz.
    if (e instanceof ApiClientError && e.status === 404) {
      return { content: [], number: page, size, totalElements: 0, totalPages: 0, last: true };
    }
    throw e;
  }
};

export const getAllTotalPrice = async (token?: string, accountType?: AccountType): Promise<MoneyPriceDTO> => {
  setApiAuthToken(token);
  const response = await getWithFallback<AppResponse<MoneyPriceDTO>>('/tootal-price', { accountType });
  return response.data;
};

export const getTotalPriceByPartyId = async (
  id: string,
  partyType: PartyType,
  token?: string,
  accountType?: AccountType
): Promise<MoneyPriceDTO> => {
  setApiAuthToken(token);
  try {
    const response = await getWithFallback<AppResponse<MoneyPriceDTO>>(`/tootal-price/${id}`, { partyType, accountType });
    return response.data;
  } catch (e) {
    // 404 = bu kontakt bilan hali hisob-kitob aloqasi yo'q. Xatoni tashlamay nol qaytaramiz,
    // shunda DebtListScreen history orqali hisoblovchi fallback'ga tabiiy o'tadi.
    if (e instanceof ApiClientError && e.status === 404) {
      return { totalDebt: 0, totalCredit: 0, balance: 0 };
    }
    throw e;
  }
};
