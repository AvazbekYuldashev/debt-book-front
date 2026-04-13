import apiClient, { setApiAuthToken } from '../api/apiClient';
import { PageResponse } from '../types/money';
import {
  ExpenseCreatedDTO,
  ExpenseResponseDTO,
  ExpenseSumFilterDTO,
  ExpenseSumResponseDTO,
} from '../types/expense';
import { AppResponse } from '../types/money';

export interface GetExpensesByCategoryParams {
  id: string;
  page?: number;
  size?: number;
  fromDate?: string;
  endDate?: string;
  token?: string;
}

export interface GetExpenseSumByCategoryParams {
  categoryId: string;
  fromDate?: string;
  endDate?: string;
  token?: string;
}

export const createExpense = async (dto: ExpenseCreatedDTO, token?: string): Promise<ExpenseResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<ExpenseResponseDTO>('/expense', dto);
  return response.data;
};

export const getExpensesByCategory = async ({
  id,
  page = 1,
  size = 15,
  fromDate,
  endDate,
  token,
}: GetExpensesByCategoryParams): Promise<PageResponse<ExpenseResponseDTO>> => {
  setApiAuthToken(token);
  const filter: ExpenseSumFilterDTO = { categoryId: id, fromDate, endDate };
  const response = await apiClient.post<PageResponse<ExpenseResponseDTO>>('/expense/by-category', filter, {
    params: { page, size },
  });
  return response.data;
};

export const deleteExpense = async (id: string, token?: string): Promise<AppResponse<string>> => {
  setApiAuthToken(token);
  const response = await apiClient.delete<AppResponse<string>>(`/expense/${id}`, { params: { id } });
  return response.data;
};

export const getExpenseSumByCategory = async ({
  categoryId,
  fromDate,
  endDate,
  token,
}: GetExpenseSumByCategoryParams): Promise<ExpenseSumResponseDTO> => {
  setApiAuthToken(token);
  const filter: ExpenseSumFilterDTO = { categoryId, fromDate, endDate };
  const response = await apiClient.post<ExpenseSumResponseDTO>('/expense/sum', filter);
  return response.data;
};
