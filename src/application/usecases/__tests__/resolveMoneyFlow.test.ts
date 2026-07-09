import { flowFor, flowForAccounts, accountTypeFromParty } from '../resolveMoneyFlow';
import { ACCOUNT_TYPE, MONEY_FLOW_TYPE } from '../../../types/money';

describe('flowFor', () => {
  it('BUSINESS -> PROFILE', () => {
    expect(flowFor('BUSINESS_ACCOUNT', 'PROFILE')).toBe(MONEY_FLOW_TYPE.BUSINESS_TO_PERSONAL);
  });
  it('PROFILE -> BUSINESS', () => {
    expect(flowFor('PROFILE', 'BUSINESS_ACCOUNT')).toBe(MONEY_FLOW_TYPE.PERSONAL_TO_BUSINESS);
  });
  it('BUSINESS -> BUSINESS', () => {
    expect(flowFor('BUSINESS_ACCOUNT', 'BUSINESS_ACCOUNT')).toBe(MONEY_FLOW_TYPE.BUSINESS_TO_BUSINESS);
  });
  it('PROFILE -> PROFILE (default)', () => {
    expect(flowFor('PROFILE', 'PROFILE')).toBe(MONEY_FLOW_TYPE.PERSONAL_TO_PERSONAL);
  });
});

describe('flowForAccounts', () => {
  it('business -> personal', () => {
    expect(flowForAccounts(ACCOUNT_TYPE.BUSINESS, ACCOUNT_TYPE.PERSONAL)).toBe(MONEY_FLOW_TYPE.BUSINESS_TO_PERSONAL);
  });
  it('personal -> business', () => {
    expect(flowForAccounts(ACCOUNT_TYPE.PERSONAL, ACCOUNT_TYPE.BUSINESS)).toBe(MONEY_FLOW_TYPE.PERSONAL_TO_BUSINESS);
  });
  it('business -> business', () => {
    expect(flowForAccounts(ACCOUNT_TYPE.BUSINESS, ACCOUNT_TYPE.BUSINESS)).toBe(MONEY_FLOW_TYPE.BUSINESS_TO_BUSINESS);
  });
  it('personal -> personal (default)', () => {
    expect(flowForAccounts(ACCOUNT_TYPE.PERSONAL, ACCOUNT_TYPE.PERSONAL)).toBe(MONEY_FLOW_TYPE.PERSONAL_TO_PERSONAL);
  });
});

describe('accountTypeFromParty', () => {
  it('BUSINESS_ACCOUNT -> business', () => {
    expect(accountTypeFromParty('BUSINESS_ACCOUNT')).toBe(ACCOUNT_TYPE.BUSINESS);
  });
  it('PROFILE -> personal', () => {
    expect(accountTypeFromParty('PROFILE')).toBe(ACCOUNT_TYPE.PERSONAL);
  });
});
