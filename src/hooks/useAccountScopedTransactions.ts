import { useCallback, useEffect, useMemo, useState } from 'react';
import { getProfileByPhone } from '../services/profileService';
import { createCredit, createDebt, getMoneyHistory, getTotalPriceByPartyId } from '../services/moneyService';
import {
  ACCOUNT_TYPE,
  MoneyActionType,
  MoneyFlowType,
  MONEY_FLOW_TYPE,
  MoneyPriceDTO,
  MoneyResponseDTO,
  PartyType,
} from '../types/money';
import { extractMoneyTotals } from '../utils/money';
import { useAccountContext } from './useAccountContext';

interface FetchMoneyInput {
  partyType: PartyType;
  partyId?: string;
  phoneFallback?: string;
}

interface CreateMoneyInput {
  amount: number;
  targetPartyType: PartyType;
  targetPartyId?: string;
  targetPhone?: string;
  description: string;
}

interface UseAccountScopedTransactionsParams {
  token?: string;
}

function flowFor(source: PartyType, target: PartyType): MoneyFlowType {
  if (source === 'BUSINESS_ACCOUNT' && target === 'PROFILE') return MONEY_FLOW_TYPE.BUSINESS_TO_PERSONAL;
  if (source === 'PROFILE' && target === 'BUSINESS_ACCOUNT') return MONEY_FLOW_TYPE.PERSONAL_TO_BUSINESS;
  if (source === 'BUSINESS_ACCOUNT' && target === 'BUSINESS_ACCOUNT') return MONEY_FLOW_TYPE.BUSINESS_TO_BUSINESS;
  return MONEY_FLOW_TYPE.PERSONAL_TO_PERSONAL;
}

function accountTypeFromParty(partyType: PartyType) {
  return partyType === 'BUSINESS_ACCOUNT' ? ACCOUNT_TYPE.BUSINESS : ACCOUNT_TYPE.PERSONAL;
}

export function useAccountScopedTransactions({ token }: UseAccountScopedTransactionsParams) {
  const { accountKey, accountType, partyType: ownerPartyType } = useAccountContext();
  const [history, setHistory] = useState<MoneyResponseDTO[]>([]);
  const [totalPrice, setTotalPrice] = useState<MoneyPriceDTO | null>(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState<{ id: string; partyType: PartyType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setHistory([]);
    setTotalPrice(null);
    setSelectedCounterparty(null);
    setError('');
  }, [accountKey]);

  const resolveCounterpartyId = useCallback(
    async (input?: FetchMoneyInput): Promise<string> => {
      if (!input) return '';
      if (input.partyId?.trim()) return input.partyId.trim();
      if (input.partyType === 'PROFILE' && input.phoneFallback) {
        const profile = await getProfileByPhone(input.phoneFallback, token);
        return profile.id;
      }
      return '';
    },
    [token]
  );

  const fetchData = useCallback(async (input?: FetchMoneyInput) => {
    if (!token || !input) {
      setHistory([]);
      setTotalPrice(null);
      return;
    }

    const resolvedCounterpartyId = await resolveCounterpartyId(input);
    if (!resolvedCounterpartyId) {
      setHistory([]);
      setTotalPrice(null);
      return;
    }

    setLoading(true);
    setError('');
    setSelectedCounterparty({ id: resolvedCounterpartyId, partyType: input.partyType });
    try {
      const [historyPage, totals] = await Promise.all([
        getMoneyHistory({
          id: resolvedCounterpartyId,
          partyType: input.partyType,
          page: 0,
          size: 30,
          token,
          accountType,
        }),
        getTotalPriceByPartyId(resolvedCounterpartyId, input.partyType, token, accountType),
      ]);
      setHistory(historyPage.content ?? []);
      setTotalPrice(totals ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, [accountType, resolveCounterpartyId, token]);

  const createMoney = useCallback(
    async (type: MoneyActionType, payload: CreateMoneyInput): Promise<boolean> => {
      if (!token) {
        setError('Token topilmadi. Qayta login qiling');
        return false;
      }

      setCreating(true);
      setError('');
      try {
        const resolvedCounterpartyId = payload.targetPartyId?.trim()
          ? payload.targetPartyId.trim()
          : payload.targetPartyType === 'PROFILE' && payload.targetPhone
            ? (await getProfileByPhone(payload.targetPhone, token)).id
            : '';

        if (!resolvedCounterpartyId) {
          throw new Error("Foydalanuvchi ID topilmadi");
        }

        const isGive = type === 'GIVE';
        const fromPartyType = isGive ? ownerPartyType : payload.targetPartyType;
        const toPartyType = isGive ? payload.targetPartyType : ownerPartyType;
        const fromAccountType = accountTypeFromParty(fromPartyType);
        const toAccountType = accountTypeFromParty(toPartyType);
        const moneyFlowType = flowFor(fromPartyType, toPartyType);

        const commonPayload = {
          amount: payload.amount,
          description: payload.description || 'Transaction',
          fromAccountType,
          toAccountType,
          moneyFlowType,
        };

        if (isGive) {
          await createCredit(
            payload.targetPartyType === 'BUSINESS_ACCOUNT'
              ? {
                  ...commonPayload,
                  targetType: 'BUSINESS_ACCOUNT',
                  targetBusinessId: resolvedCounterpartyId,
                }
              : {
                  ...commonPayload,
                  debtorId: resolvedCounterpartyId,
                },
            token
          );
        } else {
          await createDebt(
            payload.targetPartyType === 'BUSINESS_ACCOUNT'
              ? {
                  ...commonPayload,
                  targetType: 'BUSINESS_ACCOUNT',
                  targetBusinessId: resolvedCounterpartyId,
                }
              : {
                  ...commonPayload,
                  creditorId: resolvedCounterpartyId,
                },
            token
          );
        }

        if (selectedCounterparty?.id && selectedCounterparty.partyType) {
          await fetchData({ partyType: selectedCounterparty.partyType, partyId: selectedCounterparty.id });
        }
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Amaliyot bajarilmadi');
        return false;
      } finally {
        setCreating(false);
      }
    },
    [fetchData, ownerPartyType, selectedCounterparty?.id, selectedCounterparty?.partyType, token]
  );

  const totals = useMemo(() => extractMoneyTotals(totalPrice), [totalPrice]);

  return {
    history,
    totalPrice,
    totals,
    selectedCounterparty,
    loading,
    creating,
    error,
    fetchData,
    createMoney,
  };
}
