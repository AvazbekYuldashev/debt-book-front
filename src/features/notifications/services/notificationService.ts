import apiClient, { setApiAuthToken } from '../../../shared/api/apiClient';
import { PageResponse } from '../../../shared/types/money';
import { NotificationDTO, WorkspaceUnreadDTO } from '../types/notification';

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

/**
 * Har bir ish maydonidagi o'qilmaganlar soni.
 * `businessId: null` — shaxsiy profil.
 *
 * Bu YAGONA so'rov X-Business-ID sarlavhasiga qaramaydi: u barcha maydonlarni
 * birdan qaytaradi, shuning uchun qaysi maydonda turganingiz muhim emas.
 */
export const getUnreadByWorkspace = async (token?: string): Promise<WorkspaceUnreadDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<WorkspaceUnreadDTO[]>('/notification/unread-by-workspace');
  return Array.isArray(response.data) ? response.data : [];
};

export const markAllNotificationsRead = async (token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.post('/notification/read-all');
};

export const markNotificationRead = async (id: string, token?: string): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.post(`/notification/${id}/read`);
};
