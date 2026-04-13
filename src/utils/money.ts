import { MoneyPriceDTO, MoneyResponseDTO, PageResponse } from '../types/money';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const findFirstNumber = (obj: MoneyPriceDTO | null | undefined, keys: string[]): number => {
  if (!obj) return 0;
  for (const key of keys) {
    const value = obj[key];
    const numeric = toNumber(value);
    if (numeric !== 0) return numeric;
  }
  return 0;
};

export const normalizeMoney = (item: Omit<MoneyResponseDTO, 'amount'> & { amount: number | string }): MoneyResponseDTO => ({
  ...item,
  amount: toNumber(item.amount),
});

export const normalizeMoneyPage = (
  page: PageResponse<Omit<MoneyResponseDTO, 'amount'> & { amount: number | string }>
): PageResponse<MoneyResponseDTO> => ({
  ...page,
  content: page.content.map(normalizeMoney),
});

export const extractMoneyTotals = (price: MoneyPriceDTO | null) => {
  const totalDebt = findFirstNumber(price, [
    'totalDebt',
    'debt',
    'debtAmount',
    'allDebt',
    'taken',
    'debtPrice',
  ]);
  const totalCredit = findFirstNumber(price, [
    'totalCredit',
    'credit',
    'creditAmount',
    'allCredit',
    'given',
    'creditPrice',
  ]);
  const balanceFromPayload = findFirstNumber(price, ['balance', 'tootalPrice', 'total', 'net']);
  const balance = balanceFromPayload || totalCredit - totalDebt;

  return {
    totalDebt,
    totalCredit,
    balance,
  };
};

export const formatMoney = (value: number): string => `${value.toLocaleString('ru-RU')} so'm`;

export const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
