import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AuthContext } from './AuthContext';
import { storage } from '../utils/storage';
import { getCurrencyRates } from '../services/currencyService';
import { Currency, CurrencyRatesDTO, DEFAULT_CURRENCY } from '../types/money';
import { convertAmount, formatCurrency, isCurrency } from '../utils/currency';

const BASE_CURRENCY_STORAGE_KEY = 'debt-book.baseCurrency';

interface CurrencyContextValue {
  // Balanslar shu valyutada ko'rsatiladi (default UZS).
  baseCurrency: Currency;
  setBaseCurrency: (currency: Currency) => void;
  rates: CurrencyRatesDTO | null;
  ratesReady: boolean;
  refreshRates: () => Promise<void>;
  // `amount`ni `from` valyutadan `to` (default: asosiy valyuta) ga aylantiradi.
  convert: (amount: number, from: Currency, to?: Currency) => number;
  toBase: (amount: number, from: Currency) => number;
  // Summani berilgan valyuta belgisi bilan formatlaydi (default: asosiy valyuta).
  format: (amount: number, currency?: Currency) => string;
  // `from` valyutadagi summani asosiy valyutaga aylantirib formatlaydi.
  formatInBase: (amount: number, from: Currency) => string;
}

export const CurrencyContext = createContext<CurrencyContextValue>({
  baseCurrency: DEFAULT_CURRENCY,
  setBaseCurrency: () => {},
  rates: null,
  ratesReady: false,
  refreshRates: async () => {},
  convert: (amount) => amount,
  toBase: (amount) => amount,
  format: (amount) => formatCurrency(amount, DEFAULT_CURRENCY),
  formatInBase: (amount) => formatCurrency(amount, DEFAULT_CURRENCY),
});

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  const [baseCurrency, setBaseCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [rates, setRates] = useState<CurrencyRatesDTO | null>(null);
  const [ratesReady, setRatesReady] = useState(false);

  // Saqlangan asosiy valyutani tiklaymiz.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await storage.get(BASE_CURRENCY_STORAGE_KEY);
      if (!cancelled && isCurrency(saved)) {
        setBaseCurrencyState(saved);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshRates = useCallback(async () => {
    if (!token) return;
    try {
      const fresh = await getCurrencyRates(token);
      setRates(fresh);
    } catch {
      // Kurslar yuklanmasa, mavjud (yoki bo'sh) qiymat saqlanadi — konvertatsiya fallback ishlaydi.
    } finally {
      setRatesReady(true);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setRates(null);
      setRatesReady(false);
      return;
    }
    refreshRates();
  }, [token, refreshRates]);

  const setBaseCurrency = useCallback((currency: Currency) => {
    setBaseCurrencyState(currency);
    storage.set(BASE_CURRENCY_STORAGE_KEY, currency);
  }, []);

  const convert = useCallback(
    (amount: number, from: Currency, to: Currency = baseCurrency) => convertAmount(amount, from, to, rates),
    [baseCurrency, rates]
  );

  const toBase = useCallback(
    (amount: number, from: Currency) => convertAmount(amount, from, baseCurrency, rates),
    [baseCurrency, rates]
  );

  const format = useCallback(
    (amount: number, currency: Currency = baseCurrency) => formatCurrency(amount, currency),
    [baseCurrency]
  );

  const formatInBase = useCallback(
    (amount: number, from: Currency) => formatCurrency(convertAmount(amount, from, baseCurrency, rates), baseCurrency),
    [baseCurrency, rates]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      baseCurrency,
      setBaseCurrency,
      rates,
      ratesReady,
      refreshRates,
      convert,
      toBase,
      format,
      formatInBase,
    }),
    [baseCurrency, setBaseCurrency, rates, ratesReady, refreshRates, convert, toBase, format, formatInBase]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
