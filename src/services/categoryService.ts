import apiClient, { setApiAuthToken } from '../api/apiClient';
import { AppResponse, PageResponse } from '../types/money';
import { CategoryCreatedDTO, CategoryPinDTO, CategoryResponseDTO, CategoryUpdateDTO } from '../types/category';

export interface GetCategoriesParams {
  page?: number;
  size?: number;
  token?: string;
}

export const getCategories = async ({
  page = 1,
  size = 50,
  token,
}: GetCategoriesParams): Promise<PageResponse<CategoryResponseDTO>> => {
  setApiAuthToken(token);
  const response = await apiClient.get<PageResponse<CategoryResponseDTO>>('/category', { params: { page, size } });
  return response.data;
};

export const createCategory = async (dto: CategoryCreatedDTO, token?: string): Promise<CategoryResponseDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<CategoryResponseDTO>('/category', dto);
  return response.data;
};

export const updateCategory = async (dto: CategoryUpdateDTO, token?: string): Promise<AppResponse<string>> => {
  setApiAuthToken(token);
  const response = await apiClient.patch<AppResponse<string>>('/category', dto);
  return response.data;
};

export const deleteCategory = async (id: string, token?: string): Promise<AppResponse<string>> => {
  setApiAuthToken(token);
  const response = await apiClient.delete<AppResponse<string>>(`/category/${id}`, { params: { id } });
  return response.data;
};

export const pinCategory = async (dto: CategoryPinDTO, token?: string): Promise<AppResponse<string>> => {
  setApiAuthToken(token);
  const response = await apiClient.patch<AppResponse<string>>('/category/pin', dto);
  return response.data;
};
