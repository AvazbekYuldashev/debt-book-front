export const ACCOUNT_TYPE = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
} as const;

export type AccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE];

export const MONEY_FLOW_TYPE = {
  BUSINESS_TO_PERSONAL: 'BUSINESS_TO_PERSONAL',
  PERSONAL_TO_BUSINESS: 'PERSONAL_TO_BUSINESS',
  BUSINESS_TO_BUSINESS: 'BUSINESS_TO_BUSINESS',
  PERSONAL_TO_PERSONAL: 'PERSONAL_TO_PERSONAL',
} as const;

export type MoneyFlowType = (typeof MONEY_FLOW_TYPE)[keyof typeof MONEY_FLOW_TYPE];

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
  fromAccountType?: AccountType;
  toAccountType?: AccountType;
  moneyFlowType?: MoneyFlowType;
}

export interface MoneyDebtorProfileCreatedDTO {
  amount: number;
  creditorId: string;
  description: string;
  fromAccountType?: AccountType;
  toAccountType?: AccountType;
  moneyFlowType?: MoneyFlowType;
}

export interface MoneyBusinessTargetDTO {
  targetType: 'BUSINESS_ACCOUNT';
  targetBusinessId: string;
  amount: number;
  description: string;
  fromAccountType?: AccountType;
  toAccountType?: AccountType;
  moneyFlowType?: MoneyFlowType;
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
