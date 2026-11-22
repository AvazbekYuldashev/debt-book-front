import apiClient, { ApiClientError, setApiAuthToken } from '../../../shared/api/apiClient';
import {
  AccountType,
  AppResponse,
  MoneyCreditorCreatedDTO,
  MoneyDebtorCreatedDTO,
  PartyType,
  MoneyPriceDTO,
  MoneyResponseDTO,
  PageResponse,
} from '../../../shared/types/money';
import { normalizeMoney, normalizeMoneyPage } from '../../../shared/lib/money';
import { withIdempotencyKey } from '../../../shared/lib/idempotency';

const BASE_PATHS = ['/core/debt'] as const;

/**
 * `idemKey` — "bir amal, bitta yozuv" kaliti.
 *
 * Server shu kalit bilan takroriy so'rovni taniydi va pulni ikki marta
 * yozmaydi. Kalit CHAQIRUVCHIDAN keladi, shu yerda yaratilmaydi: u
 * foydalanuvchi amaliga bittadan bo'lishi va barcha urinishlarda
 * o'zgarmasligi kerak.
 */
async function postWithFallback<T>(path: string, data: unknown, idemKey?: string): Promise<T> {
  let lastError: unknown;

  for (const base of BASE_PATHS) {
    try {
      const response = await apiClient.post<T>(`${base}${path}`, data, withIdempotencyKey(undefined, idemKey));
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
  token?: string,
  idemKey?: string
): Promise<MoneyResponseDTO> => {
  setApiAuthToken(token);
  const response = await postWithFallback<Omit<MoneyResponseDTO, 'amount'> & { amount: number | string }>(
    '/take',
    dto,
    idemKey
  );
  return normalizeMoney(response);
};

export const createDebt = async (
  dto: MoneyDebtorCreatedDTO,
  token?: string,
  idemKey?: string
): Promise<MoneyResponseDTO> => {
  setApiAuthToken(token);
  const response = await postWithFallback<Omit<MoneyResponseDTO, 'amount'> & { amount: number | string }>(
    '/give',
    dto,
    idemKey
  );
  return normalizeMoney(response);
};

/**
 * Bitta oldi-berdi — id bo'yicha.
 *
 * Bildirishnomadan ochilganda ishlatiladi: xabar qaysi kontaktga
 * tegishli ekanini faqat yozuvning o'zi aniq aytadi.
 *
 * Server faqat QATNASHCHIGA beradi — begona odam yozuvni ko'rolmaydi.
 */
export const getMoneyById = async (
  id: string,
  token?: string,
): Promise<MoneyResponseDTO> => {
  setApiAuthToken(token);
  const response = await getWithMultiplePathsFallback<
    Omit<MoneyResponseDTO, 'amount'> & { amount: number | string }
  >([{ path: `/${encodeURIComponent(id)}` }]);
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
