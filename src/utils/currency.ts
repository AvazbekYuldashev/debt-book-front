import { Currency, CURRENCIES, DEFAULT_CURRENCY, CurrencyRatesDTO } from '../types/money';

export { CURRENCIES, DEFAULT_CURRENCY };
export type { Currency };

// Har bir valyutaning ko'rsatiladigan belgisi (summadan keyin qo'yiladi).
export const CURRENCY_SYMBOL: Record<Currency, string> = {
  UZS: "so'm",
  USD: '$',
  RUB: '₽',
};

// Sozlama/tanlash ro'yxatida ko'rinadigan qisqa nom.
export const CURRENCY_LABEL: Record<Currency, string> = {
  UZS: "So'm",
  USD: 'Dollar',
  RUB: 'Rubl',
};

export const isCurrency = (value: unknown): value is Currency =>
  typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);

export const normalizeCurrency = (value: unknown): Currency =>
  isCurrency(value) ? value : DEFAULT_CURRENCY;

// Har valyutaga tegishli yig'indilar xaritasi, masalan {UZS: 500000, USD: 100}.
export type CurrencyAmounts = Partial<Record<Currency, number>>;

const toNum = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

// Backend {"UZS": "500000", ...} xaritasini {UZS: 500000} ga aylantiradi
// (faqat qo'llab-quvvatlanadigan valyutalar, eski/noma'lum kalitlar UZS ga qo'shiladi).
export const parseCurrencyAmounts = (
  raw: Record<string, number | string> | null | undefined
): CurrencyAmounts => {
  const result: CurrencyAmounts = {};
  if (!raw) return result;
  for (const [key, value] of Object.entries(raw)) {
    const cur = normalizeCurrency(key);
    result[cur] = (result[cur] ?? 0) + toNum(value);
  }
  return result;
};

// 1 birlik `from` necha birlik `to`. Kurs topilmasa, xavfsiz fallback (o'zgarishsiz).
export const convertAmount = (
  amount: number,
  from: Currency,
  to: Currency,
  rates?: CurrencyRatesDTO | null
): number => {
  if (from === to) return amount;
  const rf = rates?.rates?.[from];
  const rt = rates?.rates?.[to];
  if (!rf || !rt) return amount;
  return (amount * rf) / rt;
};

// Valyuta bo'yicha ajratilgan yig'indini bitta asosiy valyutaga jamlaydi.
export const sumInBase = (
  amounts: CurrencyAmounts,
  base: Currency,
  rates?: CurrencyRatesDTO | null
): number => {
  let total = 0;
  for (const cur of CURRENCIES) {
    const value = amounts[cur];
    if (value) total += convertAmount(value, cur, base, rates);
  }
  return total;
};

// credit - debt sof balansini asosiy valyutada qaytaradi.
export const netInBase = (
  credit: CurrencyAmounts,
  debt: CurrencyAmounts,
  base: Currency,
  rates?: CurrencyRatesDTO | null
): number => sumInBase(credit, base, rates) - sumInBase(debt, base, rates);

// Summani valyuta belgisi bilan formatlaydi, masalan "1 234 567 so'm", "100 $".
export const formatCurrency = (value: number, currency: Currency = DEFAULT_CURRENCY): string => {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString('ru-RU')} ${CURRENCY_SYMBOL[currency]}`;
};
