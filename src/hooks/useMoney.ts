import { useAccountScopedTransactions } from './useAccountScopedTransactions';

interface UseMoneyParams {
  token?: string;
}

export const useMoney = ({ token }: UseMoneyParams) => useAccountScopedTransactions({ token });

export type UseMoneyResult = ReturnType<typeof useMoney>;
