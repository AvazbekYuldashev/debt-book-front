import apiClient, { setApiAuthToken } from '../api/apiClient';
import {
  BusinessCreateDTO,
  BusinessDTO,
  BusinessMemberCreateDTO,
  BusinessProfileDTO,
} from '../types/business';

export const getMyBusinesses = async (token?: string): Promise<BusinessDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<BusinessDTO[]>('/business/my');
  return response.data ?? [];
};

export const createBusiness = async (dto: BusinessCreateDTO, token?: string): Promise<BusinessDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<BusinessDTO>('/business', dto);
  return response.data;
};

export const getBusinessMembers = async (businessId: string, token?: string): Promise<BusinessProfileDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<BusinessProfileDTO[]>(`/business/${businessId}/members`);
  return response.data ?? [];
};

export const addBusinessMember = async (dto: BusinessMemberCreateDTO, token?: string): Promise<BusinessProfileDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<BusinessProfileDTO>('/business/member', dto);
  return response.data;
};
