import { useCallback, useMemo, useState } from 'react';
import { createCredit, createDebt, getMoneyHistory, getTotalPriceByPartyId } from '../services/moneyService';
import { getProfileByPhone } from '../services/profileService';
import { MoneyActionType, MoneyPriceDTO, MoneyResponseDTO, PartyType } from '../types/money';
import { extractMoneyTotals } from '../utils/money';

interface UseMoneyParams {
  token?: string;
}

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

export const useMoney = ({ token }: UseMoneyParams) => {
  const [history, setHistory] = useState<MoneyResponseDTO[]>([]);
  const [totalPrice, setTotalPrice] = useState<MoneyPriceDTO | null>(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState<{ id: string; partyType: PartyType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

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
    if (!token) {
      setHistory([]);
      setTotalPrice(null);
      return;
    }
    if (!input) {
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
        getMoneyHistory({ id: resolvedCounterpartyId, partyType: input.partyType, page: 0, size: 30, token }),
        getTotalPriceByPartyId(resolvedCounterpartyId, input.partyType, token),
      ]);
      setHistory(historyPage.content ?? []);
      setTotalPrice(totals ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, [resolveCounterpartyId, token]);

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

        let created: MoneyResponseDTO;
        if (type === 'GIVE') {
          // Qarz berish -> /take (Create Credit)
          created = await createCredit(
            payload.targetPartyType === 'BUSINESS_ACCOUNT'
              ? {
                  amount: payload.amount,
                  description: payload.description || 'Transaction',
                  targetType: 'BUSINESS_ACCOUNT',
                  targetBusinessId: resolvedCounterpartyId,
                }
              : {
                  amount: payload.amount,
                  debtorId: resolvedCounterpartyId,
                  description: payload.description || 'Transaction',
                },
            token
          );
        } else {
          // Qarz olish -> /give (Create Debt)
          created = await createDebt(
            payload.targetPartyType === 'BUSINESS_ACCOUNT'
              ? {
                  amount: payload.amount,
                  description: payload.description || 'Transaction',
                  targetType: 'BUSINESS_ACCOUNT',
                  targetBusinessId: resolvedCounterpartyId,
                }
              : {
                  amount: payload.amount,
                  creditorId: resolvedCounterpartyId,
                  description: payload.description || 'Transaction',
                },
            token
          );
        }

        setHistory((prev) => [created, ...prev]);
        if (selectedCounterparty?.id && selectedCounterparty.partyType) {
          const [historyPage, totals] = await Promise.all([
            getMoneyHistory({
              id: selectedCounterparty.id,
              partyType: selectedCounterparty.partyType,
              page: 0,
              size: 30,
              token,
            }),
            getTotalPriceByPartyId(selectedCounterparty.id, selectedCounterparty.partyType, token),
          ]);
          setHistory(historyPage.content ?? []);
          setTotalPrice(totals ?? null);
        }
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Amaliyot bajarilmadi');
        return false;
      } finally {
        setCreating(false);
      }
    },
    [selectedCounterparty, token]
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
};

export type UseMoneyResult = ReturnType<typeof useMoney>;
