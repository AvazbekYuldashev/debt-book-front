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
  status?: string;
}

export * from './category';
export * from './expense';
export * from './money';
export * from './profile';
export * from './business';
