export type PartyType = 'PROFILE' | 'BUSINESS_ACCOUNT';

export interface MoneyResponseDTO {
  id: string;
  amount: number;
  visible: boolean;
  createdDate: string;
  debtorId?: string;
  creditorId?: string;
  debtorType?: PartyType;
  creditorType?: PartyType;
  debtorBusinessId?: string;
  creditorBusinessId?: string;
  description: string;
}

export interface MoneyCreditorProfileCreatedDTO {
  amount: number;
  debtorId: string;
  description: string;
}

export interface MoneyDebtorProfileCreatedDTO {
  amount: number;
  creditorId: string;
  description: string;
}

export interface MoneyBusinessTargetDTO {
  targetType: 'BUSINESS_ACCOUNT';
  targetBusinessId: string;
  amount: number;
  description: string;
}

export type MoneyCreditorCreatedDTO = MoneyCreditorProfileCreatedDTO | MoneyBusinessTargetDTO;
export type MoneyDebtorCreatedDTO = MoneyDebtorProfileCreatedDTO | MoneyBusinessTargetDTO;

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
