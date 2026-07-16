// central place for route names to avoid typos.
// `as const` — qiymatlar literal tip bo'lib qoladi (navigation param-list tiplari uchun zarur).
export const ROUTES = {
  DEBTS: 'HisobKitob',
  EXPENSES: 'Expenses',
  PROFILE: 'Profile',
  PROFILE_HOME: 'ProfileHome',
  DEBT_LIST: 'DebtList',
  CONTACT_DETAIL: 'ContactDetail',
  NOTIFICATIONS: 'Notifications',
  EXPENSE_CATEGORIES: 'ExpenseCategories',
  EXPENSE_CATEGORY_DETAIL: 'ExpenseCategoryDetail',
  MY_BUSINESSES: 'MyBusinesses',
  BUSINESS_MEMBERS: 'BusinessMembers',
  OFFER: 'Offer',
  TERMS: 'Terms',
  PRIVACY_POLICY: 'PrivacyPolicy',
} as const;
