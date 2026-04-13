import { useCallback, useMemo, useState } from 'react';
import { createCredit, createDebt, getMoneyHistory, getTotalPriceByCreditorId } from '../services/moneyService';
import { getProfileByPhone } from '../services/profileService';
import { MoneyActionType, MoneyPriceDTO, MoneyResponseDTO } from '../types/money';
import { extractMoneyTotals } from '../utils/money';

interface UseMoneyParams {
  token?: string;
}

interface FetchMoneyInput {
  counterpartyId?: string;
  counterpartyPhone?: string;
}

interface CreateMoneyInput {
  amount: number;
  counterpartyId?: string;
  counterpartyPhone?: string;
  description: string;
}

export const useMoney = ({ token }: UseMoneyParams) => {
  const [history, setHistory] = useState<MoneyResponseDTO[]>([]);
  const [totalPrice, setTotalPrice] = useState<MoneyPriceDTO | null>(null);
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const resolveCounterpartyId = useCallback(
    async (input?: FetchMoneyInput): Promise<string> => {
      if (!input) return '';
      if (input.counterpartyId?.trim()) return input.counterpartyId.trim();
      if (input.counterpartyPhone) {
        const profile = await getProfileByPhone(input.counterpartyPhone, token);
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

    const resolvedCounterpartyId = await resolveCounterpartyId(input);
    if (!resolvedCounterpartyId) {
      setHistory([]);
      setTotalPrice(null);
      return;
    }

    setLoading(true);
    setError('');
    setSelectedCounterpartyId(resolvedCounterpartyId);
    try {
      const [historyPage, totals] = await Promise.all([
        getMoneyHistory({ id: resolvedCounterpartyId, page: 1, size: 30, token }),
        getTotalPriceByCreditorId(resolvedCounterpartyId, token),
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
        const resolvedCounterpartyId = await resolveCounterpartyId(payload);

        if (!resolvedCounterpartyId) {
          throw new Error("Foydalanuvchi ID topilmadi");
        }

        let created: MoneyResponseDTO;
        if (type === 'GIVE') {
          // Qarz berish -> /take (Create Credit)
          created = await createCredit(
            {
              amount: payload.amount,
              debtorId: resolvedCounterpartyId,
              description: payload.description || 'Transaction',
            },
            token
          );
        } else {
          // Qarz olish -> /give (Create Debt)
          created = await createDebt(
            {
              amount: payload.amount,
              creditorId: resolvedCounterpartyId,
              description: payload.description || 'Transaction',
            },
            token
          );
        }

        setHistory((prev) => [created, ...prev]);
        if (selectedCounterpartyId) {
          const [historyPage, totals] = await Promise.all([
            getMoneyHistory({ id: selectedCounterpartyId, page: 1, size: 30, token }),
            getTotalPriceByCreditorId(selectedCounterpartyId, token),
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
    [resolveCounterpartyId, selectedCounterpartyId, token]
  );

  const totals = useMemo(() => extractMoneyTotals(totalPrice), [totalPrice]);

  return {
    history,
    totalPrice,
    totals,
    selectedCounterpartyId,
    loading,
    creating,
    error,
    fetchData,
    createMoney,
  };
};

export type UseMoneyResult = ReturnType<typeof useMoney>;
