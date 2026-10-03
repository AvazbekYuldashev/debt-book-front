export interface ProfileDTO {
  id: string;
  username: string;
  name: string;
  surname: string;
  photo?: {
    id?: string;
    url?: string;
  };
  jwt?: string;
  refreshToken?: string;
  status?: string;
  /** Ilovaning asosiy rangi - hisobga bog'langan. */
  accent?: string | null;
  /** Ilova foni - hisobga bog'langan, qurilmaga emas. */
  background?: {
    imageId?: string | null;
    fit?: string | null;
    dim?: number | null;
  };
}

export * from '../../features/expenses/types/category';
export * from '../../features/expenses/types/expense';
export * from './money';
export * from '../../features/profile/types/profile';
export * from '../../features/business/types/business';
