import apiClient, { setApiAuthToken } from '../api/apiClient';
import { PageResponse } from '../types/money';
import { NotificationDTO } from '../types/notification';

export const getNotifications = async (
  page: number,
  size: number,
  token?: string,
): Promise<PageResponse<NotificationDTO>> => {
  setApiAuthToken(token);
  const response = await apiClient.get<PageResponse<NotificationDTO>>('/notification', {
    params: { page, size },
  });
  return response.data;
};

export const getUnreadNotificationCount = async (token?: string): Promise<number> => {
  setApiAuthToken(token);
  const response = await apiClient.get<number>('/notification/unread-count');
  const value = response.data;
  return typeof value === 'number' ? value : Number(value) || 0;
};

export const markAllNotificationsRead = async (token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.post('/notification/read-all');
};

export const markNotificationRead = async (id: string, token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.post(`/notification/${id}/read`);
};
