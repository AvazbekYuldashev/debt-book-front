import apiClient, { ApiClientError, setApiAuthToken } from './apiClient';
import { API_BASE } from './baseUrl';

type AppResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export interface ProfileDetailUpdateDTO {
  name: string;
  surname: string;
}

export interface ProfilePhotoUpdateDTO {
  photoId: string;
}

export interface ProfilePasswordUpdateDTO {
  oldPassword: string;
  newPassword: string;
}

export interface ProfileUsernameUpdateDTO {
  username: string;
}

export interface CodeConfirmDTO {
  code: string;
}

export const updateProfileDetail = async (dto: ProfileDetailUpdateDTO, token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.put<AppResponse<string>>('/profile/detail', dto);
};

export const updateProfilePhoto = async (dto: ProfilePhotoUpdateDTO, token?: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/profile/photo`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      'Accept-Language': 'UZ',
    },
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiClientError(text || `Request failed (${res.status} ${res.statusText})`, res.status);
  }
};

export const updateProfilePassword = async (dto: ProfilePasswordUpdateDTO, token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.put<AppResponse<string>>('/profile/password', dto);
};

export const updateProfileUsername = async (dto: ProfileUsernameUpdateDTO, token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.put<AppResponse<string>>('/profile/username', dto);
};

export const confirmProfileUsername = async (dto: CodeConfirmDTO, token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.put<AppResponse<string>>('/profile/username/confirm', dto);
};

export const getMyProfile = async (token?: string) => {
  setApiAuthToken(token);
  const response = await apiClient.get('/core/profile/me');
  return response.data;
};

export const deleteProfile = async (id: string, token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.delete<AppResponse<string>>(`/profile/${id}`);
};
