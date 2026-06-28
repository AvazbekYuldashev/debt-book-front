import { useCallback, useEffect, useMemo, useState } from 'react';
import { getProfileByPhone } from '../services/profileService';
import { createCredit, createDebt, getMoneyHistory, getTotalPriceByPartyId } from '../services/moneyService';
import {
  MoneyActionType,
  MoneyPriceDTO,
  MoneyResponseDTO,
  PartyType,
} from '../types/money';
import { extractMoneyTotals } from '../utils/money';
import { useAccountContext } from './useAccountContext';
import { accountTypeFromParty, flowFor } from '../application/usecases/resolveMoneyFlow';

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
  // Counterparty business bo'lsa: tanlangan a'zo (profileId)
  targetBusinessProfileId?: string;
}

interface UseAccountScopedTransactionsParams {
  token?: string;
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
      const baseParams = {
        id: resolvedCounterpartyId,
        partyType: input.partyType,
        page: 0,
        size: 50,
        token,
        accountType,
      };

      const [historyPage, totals] = await Promise.all([
        getMoneyHistory(baseParams),
        getTotalPriceByPartyId(resolvedCounterpartyId, input.partyType, token, accountType),
      ]);

      let content = historyPage.content ?? [];

      // Backend ba'zan accountType=business bilan faqat biznes CREDITOR bo'lgan
      // tranzaksiyalarni qaytaradi — mijoz bergan (biznes debtor) yo'nalishini o'tkazib
      // yuboradi. accountType ko'rsatmasdan yana bir so'rov yuborib, ikki tomonni merge
      // qilamiz va id bo'yicha dedup qilamiz.
      if (accountType) {
        try {
          const reverseHistoryPage = await getMoneyHistory({ ...baseParams, accountType: undefined });
          const reverseContent = reverseHistoryPage.content ?? [];
          if (reverseContent.length > 0) {
            const seen = new Set(content.map((item) => item.id));
            const extra = reverseContent.filter((item) => !seen.has(item.id));
            if (extra.length > 0) {
              content = [...content, ...extra].sort(
                (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
              );
            }
          }
        } catch {
          // Reverse so'rov muvaffaqiyatsiz bo'lsa asosiy natija saqlanadi.
        }
      }

      setHistory(content);
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
                  targetBusinessProfileId: payload.targetBusinessProfileId,
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
                  targetBusinessProfileId: payload.targetBusinessProfileId,
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
