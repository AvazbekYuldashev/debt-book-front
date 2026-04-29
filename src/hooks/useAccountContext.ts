import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { ACCOUNT_TYPE, AccountType, PartyType } from '../types/money';

interface AccountContextValue {
  accountType: AccountType;
  partyType: PartyType;
  accountId: string;
  accountKey: string;
}

export function useAccountContext(): AccountContextValue {
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);

  return useMemo(() => {
    const isBusiness = workspace.mode === 'business' && Boolean(workspace.activeBusinessId);
    const accountType = isBusiness ? ACCOUNT_TYPE.BUSINESS : ACCOUNT_TYPE.PERSONAL;
    const partyType: PartyType = isBusiness ? 'BUSINESS_ACCOUNT' : 'PROFILE';
    const accountId = isBusiness ? workspace.activeBusinessId || '' : profile?.id || '';
    const accountKey = `${accountType}:${accountId || 'unknown'}`;
    return { accountType, partyType, accountId, accountKey };
  }, [profile?.id, workspace.activeBusinessId, workspace.mode]);
}
