export const ACCOUNT_TYPE = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
} as const;

export type AccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE];

// Qo'llab-quvvatlanadigan valyutalar. Har bir oldi-berdi o'z valyutasida saqlanadi.
export const CURRENCIES = ['UZS', 'USD', 'RUB'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = 'UZS';

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
  currency?: Currency;
  visible: boolean;
  createdDate: string;
  createdByProfileId?: string;
  createdByProfilePhone?: string;
  debtorId?: string;
  creditorId?: string;
  debtorType?: PartyType;
  creditorType?: PartyType;
  debtorBusinessId?: string;
  creditorBusinessId?: string;
  creditorBusinessProfilePhone?: string;
  creditorBusinessProfileId?: string;
  debtorBusinessProfilePhone?: string;
  debtorBusinessProfileId?: string;
  description: string;
}

export interface MoneyCreditorProfileCreatedDTO {
  amount: number;
  currency?: Currency;
  debtorId: string;
  description: string;
  fromAccountType?: AccountType;
  toAccountType?: AccountType;
  moneyFlowType?: MoneyFlowType;
}

export interface MoneyDebtorProfileCreatedDTO {
  amount: number;
  currency?: Currency;
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
  currency?: Currency;
  description: string;
  fromAccountType?: AccountType;
  toAccountType?: AccountType;
  moneyFlowType?: MoneyFlowType;
  // Counterparty business'ning tanlangan a'zosi (kim bilan ish ko'rildi)
  targetBusinessProfileId?: string;
}

export type MoneyCreditorCreatedDTO = MoneyCreditorProfileCreatedDTO | MoneyBusinessTargetDTO;
export type MoneyDebtorCreatedDTO = MoneyDebtorProfileCreatedDTO | MoneyBusinessTargetDTO;

export interface MoneyPriceDTO {
  totalDebt?: number;
  totalCredit?: number;
  balance?: number;
  // Valyuta bo'yicha ajratilgan yig'indilar: {"UZS": 500000, "USD": 100}
  creditByCurrency?: Record<string, number | string>;
  debtByCurrency?: Record<string, number | string>;
  [key: string]: string | number | boolean | null | undefined | Record<string, number | string>;
}

// Backend /core/currency/rates javobi: 1 birlik valyuta necha so'mligi.
export interface CurrencyRatesDTO {
  base: string;
  rates: Record<string, number>;
  date?: string;
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
