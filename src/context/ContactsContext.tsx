import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClientDTO, ClientFilterDTO, createClient, deleteClient, filterClients, getMyClients, updateClient } from '../api/client';
import { AuthContext } from './AuthContext';
import { WorkspaceContext } from './WorkspaceContext';
import { ACCOUNT_TYPE, PartyType } from '../types/money';
import { useAccountContext } from '../hooks/useAccountContext';
import { getPhoneValidationError, normalizePhone } from '../utils/phone';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  fullName: string;
  partyType: PartyType;
  partyId: string;
  creditorId?: string;
  debtorId?: string;
  creditorType?: PartyType;
  debtorType?: PartyType;
  creditorBusinessId?: string;
  debtorBusinessId?: string;
  debtAmount: number;
  interestAmount: number;
}

interface ContactFormInput {
  name: string;
  targetType: PartyType;
  phone?: string;
  targetBusinessId?: string;
}

interface ContactUpdateInput {
  name: string;
}

interface ContactFilterInput {
  name?: string;
  phoneNumber?: string;
}

interface ContactsContextValue {
  contacts: Contact[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string;
  refreshContacts: () => Promise<void>;
  filterContacts: (input: ContactFilterInput) => Promise<Contact[]>;
  addContact: (input: ContactFormInput) => Promise<boolean>;
  updateContact: (id: string, input: ContactUpdateInput) => Promise<boolean>;
  deleteContact: (id: string) => Promise<boolean>;
}

export const ContactsContext = createContext<ContactsContextValue>({
  contacts: [],
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  error: '',
  refreshContacts: async () => {},
  filterContacts: async () => [],
  addContact: async () => false,
  updateContact: async () => false,
  deleteContact: async () => false,
});

const normalized = (value?: string | null): string => (value || '').trim().toLowerCase();

const resolveCounterparty = (
  input: ClientDTO,
  actorType: PartyType,
  actorId?: string | null
): { partyType: PartyType; partyId: string } => {
  const actor = normalized(actorId);
  const creditorProfileId = normalized(input.creditorId);
  const debtorProfileId = normalized(input.debtorId);
  const creditorBusinessId = normalized(input.creditorBusinessId);
  const debtorBusinessId = normalized(input.debtorBusinessId);

  const actorIsCreditor =
    actorType === 'BUSINESS_ACCOUNT'
      ? (input.creditorType === 'BUSINESS_ACCOUNT' && creditorBusinessId === actor) || creditorBusinessId === actor
      : (input.creditorType === 'PROFILE' && creditorProfileId === actor) || creditorProfileId === actor;

  const actorIsDebtor =
    actorType === 'BUSINESS_ACCOUNT'
      ? (input.debtorType === 'BUSINESS_ACCOUNT' && debtorBusinessId === actor) || debtorBusinessId === actor
      : (input.debtorType === 'PROFILE' && debtorProfileId === actor) || debtorProfileId === actor;

  if (actorIsCreditor) {
    if (input.debtorType === 'BUSINESS_ACCOUNT' || debtorBusinessId) {
      return { partyType: 'BUSINESS_ACCOUNT', partyId: input.debtorBusinessId || '' };
    }
    return { partyType: 'PROFILE', partyId: input.debtorId || '' };
  }

  if (actorIsDebtor) {
    if (input.creditorType === 'BUSINESS_ACCOUNT' || creditorBusinessId) {
      return { partyType: 'BUSINESS_ACCOUNT', partyId: input.creditorBusinessId || '' };
    }
    return { partyType: 'PROFILE', partyId: input.creditorId || '' };
  }

  if (input.debtorType === 'BUSINESS_ACCOUNT' || debtorBusinessId) {
    return { partyType: 'BUSINESS_ACCOUNT', partyId: input.debtorBusinessId || '' };
  }
  if (input.debtorId) {
    return { partyType: 'PROFILE', partyId: input.debtorId || '' };
  }
  if (input.creditorType === 'BUSINESS_ACCOUNT' || creditorBusinessId) {
    return { partyType: 'BUSINESS_ACCOUNT', partyId: input.creditorBusinessId || '' };
  }
  return { partyType: 'PROFILE', partyId: input.creditorId || '' };
};

const toContact = (input: ClientDTO, actorType: PartyType, actorId?: string | null): Contact => {
  const parts = (input.name || '').trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || input.name || '';
  const lastName = parts.slice(1).join(' ');
  const counterparty =
    input.partyType && input.partyId
      ? { partyType: input.partyType, partyId: input.partyId }
      : resolveCounterparty(input, actorType, actorId);
  const fallbackPartyType = input.phoneNumber ? 'PROFILE' : 'BUSINESS_ACCOUNT';
  return {
    id: input.id,
    firstName,
    lastName,
    phone: input.phoneNumber || '',
    fullName: input.name || `${firstName} ${lastName}`.trim(),
    partyType: counterparty.partyId ? counterparty.partyType : fallbackPartyType,
    partyId: counterparty.partyId,
    creditorId: input.creditorId,
    debtorId: input.debtorId,
    creditorType: input.creditorType,
    debtorType: input.debtorType,
    creditorBusinessId: input.creditorBusinessId,
    debtorBusinessId: input.debtorBusinessId,
    debtAmount: 0,
    interestAmount: 0,
  };
};

// Bir munosabat uchun (A va B bir-birini qo'shsa) ikkita mirror client yozuvi bo'lishi mumkin.
// Ro'yxatda bir qarama-qarshi tomon (partyId) FAQAT BIR marta ko'rinishi kerak — aks holda
// balans har kontakt bo'yicha alohida sanalib, summa ikkilanadi. Birinchi (eng yangi) yozuv saqlanadi.
const dedupeByCounterparty = (list: Contact[]): Contact[] => {
  const seen = new Set<string>();
  const result: Contact[] = [];
  for (const contact of list) {
    const key = contact.partyId
      ? `${contact.partyType}:${normalized(contact.partyId)}`
      : `id:${contact.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(contact);
  }
  return result;
};

const mapNameToContact = (contact: Contact, name: string): Contact => {
  const cleanName = name.trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || cleanName || contact.firstName;
  const lastName = parts.slice(1).join(' ');
  return {
    ...contact,
    firstName,
    lastName,
    fullName: cleanName || `${firstName} ${lastName}`.trim(),
  };
};

const validateContactInput = (input: ContactFormInput): string => {
  const cleanName = input.name.trim();
  if (!cleanName) return 'Ism majburiy';

  if (input.targetType === 'BUSINESS_ACCOUNT') {
    if (!input.targetBusinessId?.trim()) return 'Business ID majburiy';
    return '';
  }

  const phoneError = getPhoneValidationError(input.phone || '');
  if (phoneError === 'empty') return 'Telefon majburiy';
  if (phoneError === 'length') return "Telefon 9 yoki 12 xonali bo'lishi kerak";
  if (phoneError === 'prefix') return "12 xonali telefon 998 bilan boshlanishi kerak";
  return '';
};

const validateContactUpdateInput = (input: ContactUpdateInput): string => {
  const cleanName = input.name.trim();
  if (!cleanName) return 'Ism majburiy';
  return '';
};

// Yagona normalizatsiya manbasi: ../utils/phone.normalizePhone
const toPhoneNumber = (phone: string): string => normalizePhone(phone);

export const ContactsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useContext(AuthContext);
  const { workspace, isWorkspaceReady } = useContext(WorkspaceContext);
  const { accountType, accountKey } = useAccountContext();
  const queryClient = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const actorType: PartyType = accountType === ACCOUNT_TYPE.BUSINESS ? 'BUSINESS_ACCOUNT' : 'PROFILE';
  const actorId = actorType === 'BUSINESS_ACCOUNT' ? workspace.activeBusinessId : profile?.id;

  // Server-state React Query qo'lida: cache + dedup + retry. Kalit accountKey ga bog'liq —
  // workspace almashganda avtomatik qayta yuklanadi (avvalgi qo'lda useEffect o'rniga).
  const contactsQuery = useQuery<Contact[]>({
    queryKey: ['contacts', accountKey],
    enabled: Boolean(profile?.jwt) && isWorkspaceReady,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const clients = await getMyClients(profile!.jwt!, 0, 100, { accountType });
      return dedupeByCounterparty(clients.map((client) => toContact(client, actorType, actorId)));
    },
  });

  const contacts = contactsQuery.data ?? [];
  const loading = contactsQuery.isLoading || contactsQuery.isRefetching;
  const queryErrorMsg = contactsQuery.isError
    ? contactsQuery.error instanceof Error
      ? contactsQuery.error.message
      : 'Kontaktlar yuklanmadi'
    : '';
  const error = mutationError || queryErrorMsg;

  const refreshContacts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['contacts', accountKey] });
  }, [queryClient, accountKey]);

  const filterContacts = useCallback(
    async (input: ContactFilterInput): Promise<Contact[]> => {
      if (!profile?.jwt) return [];
      if (!isWorkspaceReady) return [];
      const name = input.name?.trim() || '';
      const phoneDigits = (input.phoneNumber || '').replace(/\D/g, '');
      if (name.length < 3 && phoneDigits.length < 3) return contacts;
      const dto: ClientFilterDTO = {
        name: name || undefined,
        phoneNumber: phoneDigits.length > 0 ? phoneDigits : undefined,
        accountType,
      };

      const filtered = await filterClients(profile.jwt, dto, 0, 100, { accountType });
      return dedupeByCounterparty(filtered.map((client) => toContact(client, actorType, actorId)));
    },
    [accountType, actorId, actorType, contacts, isWorkspaceReady, profile?.jwt]
  );

  const addContact = useCallback(
    async (input: ContactFormInput): Promise<boolean> => {
      if (!profile?.jwt) {
        setMutationError('Avval tizimga kiring');
        return false;
      }
      const validationError = validateContactInput(input);
      if (validationError) {
        setMutationError(validationError);
        return false;
      }

      setCreating(true);
      setMutationError('');
      try {
        const created = await createClient(
          profile.jwt,
          input.targetType === 'BUSINESS_ACCOUNT'
            ? {
                name: input.name.trim(),
                targetType: 'BUSINESS_ACCOUNT',
                targetBusinessId: input.targetBusinessId!.trim(),
                accountType,
              }
            : {
                name: input.name.trim(),
                phoneNumber: toPhoneNumber(input.phone || ''),
                accountType,
              },
          { accountType }
        );
        queryClient.setQueryData<Contact[]>(['contacts', accountKey], (prev) =>
          dedupeByCounterparty([toContact(created, actorType, actorId), ...(prev ?? [])])
        );
        return true;
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : "Kontakt qo'shilmadi");
        return false;
      } finally {
        setCreating(false);
      }
    },
    [accountKey, accountType, actorId, actorType, profile?.jwt, queryClient]
  );

  const updateContact = useCallback(
    async (id: string, input: ContactUpdateInput): Promise<boolean> => {
      if (!profile?.jwt) {
        setMutationError('Avval tizimga kiring');
        return false;
      }
      if (!isWorkspaceReady) {
        setMutationError('Workspace hali tayyor emas');
        return false;
      }

      const validationError = validateContactUpdateInput(input);
      if (validationError) {
        setMutationError(validationError);
        return false;
      }

      setUpdating(true);
      setMutationError('');
      try {
        await updateClient(
          profile.jwt,
          id,
          {
            id,
            name: input.name.trim(),
          },
          { accountType }
        );
        queryClient.setQueryData<Contact[]>(['contacts', accountKey], (prev) =>
          (prev ?? []).map((contact) => (contact.id === id ? mapNameToContact(contact, input.name) : contact))
        );
        return true;
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : "Kontakt o'zgartirilmadi");
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [accountKey, accountType, isWorkspaceReady, profile?.jwt, queryClient]
  );

  const deleteContactHandler = useCallback(
    async (id: string): Promise<boolean> => {
      if (!profile?.jwt) {
        setMutationError('Avval tizimga kiring');
        return false;
      }
      if (!isWorkspaceReady) {
        setMutationError('Workspace hali tayyor emas');
        return false;
      }

      setDeleting(true);
      setMutationError('');
      try {
        await deleteClient(profile.jwt, id, { accountType });
        queryClient.setQueryData<Contact[]>(['contacts', accountKey], (prev) =>
          (prev ?? []).filter((contact) => contact.id !== id)
        );
        return true;
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : "Kontakt o'chirilmadi");
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [accountKey, accountType, isWorkspaceReady, profile?.jwt, queryClient]
  );

  return (
    <ContactsContext.Provider
      value={{
        contacts,
        loading,
        creating,
        updating,
        deleting,
        error,
        refreshContacts,
        filterContacts,
        addContact,
        updateContact,
        deleteContact: deleteContactHandler,
      }}
    >
      {children}
    </ContactsContext.Provider>
  );
};
