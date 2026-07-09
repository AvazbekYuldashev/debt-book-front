import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ROUTES } from './routes';

/**
 * Debts (Hisob-kitob) stack'ining route param'lari.
 * Har bir ekran shu tip orqali `navigation`/`route`ni type-safe oladi —
 * `navigation: any` / `React.FC<any>` o'rniga.
 */
export type DebtsStackParamList = {
  [ROUTES.DEBT_LIST]: undefined;
  [ROUTES.CONTACT_DETAIL]: { id: string };
};

export type DebtsNavigation = NativeStackNavigationProp<DebtsStackParamList>;

// Ekran komponenti uchun to'liq (navigation + route) proplar tipi.
export type DebtsScreenProps<T extends keyof DebtsStackParamList> = NativeStackScreenProps<
  DebtsStackParamList,
  T
>;

/** Expenses (Xarajatlar) stack'ining route param'lari. */
export type ExpensesStackParamList = {
  [ROUTES.EXPENSE_CATEGORIES]: undefined;
  [ROUTES.EXPENSE_CATEGORY_DETAIL]: {
    id: string;
    name: string;
    fromDate?: string;
    endDate?: string;
  };
};

export type ExpensesNavigation = NativeStackNavigationProp<ExpensesStackParamList>;

export type ExpensesScreenProps<T extends keyof ExpensesStackParamList> = NativeStackScreenProps<
  ExpensesStackParamList,
  T
>;
