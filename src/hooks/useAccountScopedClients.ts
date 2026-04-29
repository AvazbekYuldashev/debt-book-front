import { useContext, useMemo } from 'react';
import { ContactsContext } from '../context/ContactsContext';
import { useAccountContext } from './useAccountContext';

export function useAccountScopedClients() {
  const contactsState = useContext(ContactsContext);
  const account = useAccountContext();

  return useMemo(
    () => ({
      ...contactsState,
      accountType: account.accountType,
      accountKey: account.accountKey,
      emptyStateText: "Bu accountda hali oldi-berdi yo'q",
    }),
    [account.accountKey, account.accountType, contactsState]
  );
}
