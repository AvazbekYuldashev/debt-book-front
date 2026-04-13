export interface MoneyResponseDTO {
  id: string;
  amount: number;
  visible: boolean;
  createdDate: string;
  debtorId: string;
  creditorId: string;
  description: string;
}

export interface MoneyCreditorCreatedDTO {
  amount: number;
  debtorId: string;
  description: string;
}

export interface MoneyDebtorCreatedDTO {
  amount: number;
  creditorId: string;
  description: string;
}

export interface MoneyPriceDTO {
  totalDebt?: number;
  totalCredit?: number;
  balance?: number;
  [key: string]: string | number | boolean | null | undefined;
}

export interface AppResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export type MoneyActionType = 'TAKE' | 'GIVE';
