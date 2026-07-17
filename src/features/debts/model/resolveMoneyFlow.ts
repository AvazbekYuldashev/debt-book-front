import { ACCOUNT_TYPE, AccountType, MoneyFlowType, MONEY_FLOW_TYPE, PartyType } from '../../../shared/types/money';

// ============================================================
//  Domain use-case: pul oqimi turini (flow) va account turini aniqlash.
//  Avval useAccountScopedTransactions ichida edi — endi sof, testlanadigan funksiyalar.
// ============================================================

export function flowFor(source: PartyType, target: PartyType): MoneyFlowType {
  if (source === 'BUSINESS_ACCOUNT' && target === 'PROFILE') return MONEY_FLOW_TYPE.BUSINESS_TO_PERSONAL;
  if (source === 'PROFILE' && target === 'BUSINESS_ACCOUNT') return MONEY_FLOW_TYPE.PERSONAL_TO_BUSINESS;
  if (source === 'BUSINESS_ACCOUNT' && target === 'BUSINESS_ACCOUNT') return MONEY_FLOW_TYPE.BUSINESS_TO_BUSINESS;
  return MONEY_FLOW_TYPE.PERSONAL_TO_PERSONAL;
}

export function accountTypeFromParty(partyType: PartyType): AccountType {
  return partyType === 'BUSINESS_ACCOUNT' ? ACCOUNT_TYPE.BUSINESS : ACCOUNT_TYPE.PERSONAL;
}

/** Account turlari (kimdan → kimga) bo'yicha pul oqimi turini aniqlaydi. */
export function flowForAccounts(from: AccountType, to: AccountType): MoneyFlowType {
  if (from === ACCOUNT_TYPE.BUSINESS && to === ACCOUNT_TYPE.PERSONAL) return MONEY_FLOW_TYPE.BUSINESS_TO_PERSONAL;
  if (from === ACCOUNT_TYPE.PERSONAL && to === ACCOUNT_TYPE.BUSINESS) return MONEY_FLOW_TYPE.PERSONAL_TO_BUSINESS;
  if (from === ACCOUNT_TYPE.BUSINESS) return MONEY_FLOW_TYPE.BUSINESS_TO_BUSINESS;
  return MONEY_FLOW_TYPE.PERSONAL_TO_PERSONAL;
}
