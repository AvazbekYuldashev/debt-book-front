import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { ClientDTO, ClientFilterDTO, createClient, deleteClient, filterClients, getMyClients, updateClient } from '../api/client';
import { AuthContext } from './AuthContext';
import { WorkspaceContext } from './WorkspaceContext';
import { ACCOUNT_TYPE, PartyType } from '../types/money';
import { useAccountContext } from '../hooks/useAccountContext';

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

  const digits = (input.phone || '').replace(/\D/g, '');
  if (!digits) return 'Telefon majburiy';
  if (digits.length !== 9 && digits.length !== 12) return "Telefon 9 yoki 12 xonali bo'lishi kerak";
  if (digits.length === 12 && !digits.startsWith('998')) return "12 xonali telefon 998 bilan boshlanishi kerak";
  return '';
};

const validateContactUpdateInput = (input: ContactUpdateInput): string => {
  const cleanName = input.name.trim();
  if (!cleanName) return 'Ism majburiy';
  return '';
};

const toPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return `998${digits}`;
  return digits;
};

export const ContactsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useContext(AuthContext);
  const { workspace, isWorkspaceReady } = useContext(WorkspaceContext);
  const { accountType, accountKey } = useAccountContext();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const actorType: PartyType = accountType === ACCOUNT_TYPE.BUSINESS ? 'BUSINESS_ACCOUNT' : 'PROFILE';
  const actorId = actorType === 'BUSINESS_ACCOUNT' ? workspace.activeBusinessId : profile?.id;

  const refreshContacts = useCallback(async () => {
    if (!profile?.jwt) {
      setContacts([]);
      setError('');
      return;
    }
    if (!isWorkspaceReady) return;
    setLoading(true);
    setError('');
    try {
      const clients = await getMyClients(profile.jwt, 0, 100, { accountType });
      setContacts(clients.map((client) => toContact(client, actorType, actorId)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kontaktlar yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [accountType, actorId, actorType, isWorkspaceReady, profile?.jwt]);

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
      return filtered.map((client) => toContact(client, actorType, actorId));
    },
    [accountType, actorId, actorType, contacts, isWorkspaceReady, profile?.jwt]
  );

  const addContact = useCallback(
    async (input: ContactFormInput): Promise<boolean> => {
      if (!profile?.jwt) {
        setError('Avval tizimga kiring');
        return false;
      }
      const validationError = validateContactInput(input);
      if (validationError) {
        setError(validationError);
        return false;
      }

      setCreating(true);
      setError('');
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
        setContacts((prev) => [toContact(created, actorType, actorId), ...prev]);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kontakt qo'shilmadi");
        return false;
      } finally {
        setCreating(false);
      }
    },
    [accountType, actorId, actorType, profile?.jwt]
  );

  const updateContact = useCallback(
    async (id: string, input: ContactUpdateInput): Promise<boolean> => {
      if (!profile?.jwt) {
        setError('Avval tizimga kiring');
        return false;
      }
      if (!isWorkspaceReady) {
        setError('Workspace hali tayyor emas');
        return false;
      }

      const validationError = validateContactUpdateInput(input);
      if (validationError) {
        setError(validationError);
        return false;
      }

      setUpdating(true);
      setError('');
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
        setContacts((prev) =>
          prev.map((contact) => (contact.id === id ? mapNameToContact(contact, input.name) : contact))
        );
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kontakt o'zgartirilmadi");
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [accountType, isWorkspaceReady, profile?.jwt]
  );

  const deleteContactHandler = useCallback(
    async (id: string): Promise<boolean> => {
      if (!profile?.jwt) {
        setError('Avval tizimga kiring');
        return false;
      }
      if (!isWorkspaceReady) {
        setError('Workspace hali tayyor emas');
        return false;
      }

      setDeleting(true);
      setError('');
      try {
        await deleteClient(profile.jwt, id, { accountType });
        setContacts((prev) => prev.filter((contact) => contact.id !== id));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kontakt o'chirilmadi");
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [accountType, isWorkspaceReady, profile?.jwt]
  );

  useEffect(() => {
    setContacts([]);
    setError('');
    refreshContacts();
  }, [accountKey, refreshContacts, workspace.activeBusinessId, workspace.mode]);

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
