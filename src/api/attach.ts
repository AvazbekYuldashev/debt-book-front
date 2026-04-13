import { Platform } from 'react-native';
import apiClient, { setApiAuthToken } from './apiClient';

export interface AttachDTO {
  id: string;
  originName?: string;
  size?: number;
  extension?: string;
  createdData?: string;
  url?: string;
}

export const uploadAttachFile = async (file: Blob & { name?: string; type?: string }, token?: string): Promise<AttachDTO> => {
  setApiAuthToken(token);
  const form = new FormData();
  const filename = file.name || `photo-${Date.now()}.jpg`;
  form.append('file', file, filename);
  const response = await apiClient.post<AttachDTO>('/attach/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data,
  });
  return response.data;
};

export const uploadAttach = async (
  file: { uri: string; name: string; type: string },
  token?: string
): Promise<AttachDTO> => {
  setApiAuthToken(token);
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append('file', blob, file.name);
  } else {
    form.append('file', file as unknown as Blob);
  }
  const response = await apiClient.post<AttachDTO>('/attach/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data,
  });
  return response.data;
};
