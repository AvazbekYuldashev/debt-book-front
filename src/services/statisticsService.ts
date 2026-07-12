import apiClient, { setApiAuthToken } from '../api/apiClient';

export interface UserStatsDTO {
  /** To'liq ro'yxatdan o'tgan (ACTIVE) foydalanuvchilar soni. */
  registeredUsers: number;
  /** Raqami kontakt sifatida kiritilgan, lekin hali ro'yxatdan o'tmaganlar soni. */
  pendingUsers: number;
}

/** Ilova bo'yicha umumiy foydalanuvchi statistikasi. */
export const getUserStats = async (token?: string): Promise<UserStatsDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<UserStatsDTO>('/statistics/users');
  const data = response.data;
  return {
    registeredUsers: Number(data?.registeredUsers) || 0,
    pendingUsers: Number(data?.pendingUsers) || 0,
  };
};
