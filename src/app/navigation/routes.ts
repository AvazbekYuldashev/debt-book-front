// central place for route names to avoid typos.
// `as const` — qiymatlar literal tip bo'lib qoladi (navigation param-list tiplari uchun zarur).
export const ROUTES = {
  DEBTS: 'HisobKitob',
  EXPENSES: 'Expenses',
  GAP: 'GapKassa',
  PROFILE: 'Profile',
  PROFILE_HOME: 'ProfileHome',
  DEBT_LIST: 'DebtList',
  CONTACT_DETAIL: 'ContactDetail',
  NOTIFICATIONS: 'Notifications',
  EXPENSE_CATEGORIES: 'ExpenseCategories',
  EXPENSE_CATEGORY_DETAIL: 'ExpenseCategoryDetail',
  // Gap kassa (aylanma jamg'arma) bo'limi.
  GAP_GROUPS: 'GapGroups',
  GAP_GROUP_DETAIL: 'GapGroupDetail',
  GAP_MEMBERS: 'GapMembers',
  GAP_QUEUE: 'GapQueue',
  GAP_ROUNDS: 'GapRounds',
  GAP_HISTORY: 'GapHistory',
  GAP_BALANCES: 'GapBalances',
  GAP_SETTLEMENT: 'GapSettlement',
  MY_BUSINESSES: 'MyBusinesses',
  BUSINESS_MEMBERS: 'BusinessMembers',
  OFFER: 'Offer',
  TERMS: 'Terms',
  PRIVACY_POLICY: 'PrivacyPolicy',
} as const;
