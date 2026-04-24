import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { ClientDTO, ClientFilterDTO, createClient, deleteClient, filterClients, getMyClients, updateClient } from '../api/client';
import { AuthContext } from './AuthContext';
import { WorkspaceContext } from './WorkspaceContext';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  fullName: string;
  creditorId?: string;
  debtorId?: string;
  debtAmount: number;
  interestAmount: number;
}

interface ContactFormInput {
  name: string;
  phone: string;
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

const toContact = (input: ClientDTO): Contact => {
  const parts = (input.name || '').trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || input.name || '';
  const lastName = parts.slice(1).join(' ');
  return {
    id: input.id,
    firstName,
    lastName,
    phone: input.phoneNumber,
    fullName: input.name || `${firstName} ${lastName}`.trim(),
    creditorId: input.creditorId,
    debtorId: input.debtorId,
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
  const digits = input.phone.replace(/\D/g, '');
  if (!cleanName || !digits) return "Ism va telefon majburiy";
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

const findDuplicateByPhone = (
  contacts: Contact[],
  phone: string,
  ignoreId?: string
): Contact | undefined => {
  const normalizedPhone = toPhoneNumber(phone);
  return contacts.find((contact) => contact.id !== ignoreId && toPhoneNumber(contact.phone) === normalizedPhone);
};

export const ContactsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useContext(AuthContext);
  const { workspace, isWorkspaceReady } = useContext(WorkspaceContext);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const isBusinessWorkspace = workspace.mode === 'business' && !!workspace.activeBusinessId;

  const refreshContacts = useCallback(async () => {
    if (!profile?.jwt) {
      setContacts([]);
      setError('');
      return;
    }
    if (!isWorkspaceReady) return;
    if (!isBusinessWorkspace) {
      setContacts([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const clients = await getMyClients(profile.jwt, 1, 100);
      setContacts(clients.map(toContact));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kontaktlar yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [isBusinessWorkspace, isWorkspaceReady, profile?.jwt]);

  const filterContacts = useCallback(
    async (input: ContactFilterInput): Promise<Contact[]> => {
      if (!profile?.jwt) return [];
      if (!isWorkspaceReady || !isBusinessWorkspace) return [];

      const name = input.name?.trim() || '';
      const phoneDigits = (input.phoneNumber || '').replace(/\D/g, '');
      if (name.length < 3 && phoneDigits.length < 3) return contacts;
      const dto: ClientFilterDTO = {
        name: name || undefined,
        phoneNumber: phoneDigits.length > 0 ? phoneDigits : undefined,
      };

      const filtered = await filterClients(profile.jwt, dto, 1, 100);
      return filtered.map(toContact);
    },
    [contacts, isBusinessWorkspace, isWorkspaceReady, profile?.jwt]
  );

  const addContact = useCallback(
    async (input: ContactFormInput): Promise<boolean> => {
      if (!profile?.jwt) {
        setError('Avval tizimga kiring');
        return false;
      }
      if (!isWorkspaceReady || !isBusinessWorkspace) {
        setError('Kontaktlar bilan ishlash uchun business workspace tanlang');
        return false;
      }

      const validationError = validateContactInput(input);
      if (validationError) {
        setError(validationError);
        return false;
      }

      const duplicate = findDuplicateByPhone(contacts, input.phone);
      if (duplicate) {
        setError('Bu mijoz tizimda mavjud.');
        return false;
      }

      setCreating(true);
      setError('');
      try {
        const created = await createClient(profile.jwt, {
          name: input.name.trim(),
          phoneNumber: toPhoneNumber(input.phone),
        });
        setContacts((prev) => [toContact(created), ...prev]);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kontakt qo'shilmadi");
        return false;
      } finally {
        setCreating(false);
      }
    },
    [contacts, isBusinessWorkspace, isWorkspaceReady, profile?.jwt]
  );

  const updateContact = useCallback(
    async (id: string, input: ContactUpdateInput): Promise<boolean> => {
      if (!profile?.jwt) {
        setError('Avval tizimga kiring');
        return false;
      }
      if (!isWorkspaceReady || !isBusinessWorkspace) {
        setError('Kontaktlar bilan ishlash uchun business workspace tanlang');
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
        await updateClient(profile.jwt, id, {
          id,
          name: input.name.trim(),
        });
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
    [isBusinessWorkspace, isWorkspaceReady, profile?.jwt]
  );

  const deleteContactHandler = useCallback(
    async (id: string): Promise<boolean> => {
      if (!profile?.jwt) {
        setError('Avval tizimga kiring');
        return false;
      }
      if (!isWorkspaceReady || !isBusinessWorkspace) {
        setError('Kontaktlar bilan ishlash uchun business workspace tanlang');
        return false;
      }

      setDeleting(true);
      setError('');
      try {
        await deleteClient(profile.jwt, id);
        setContacts((prev) => prev.filter((contact) => contact.id !== id));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kontakt o'chirilmadi");
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [isBusinessWorkspace, isWorkspaceReady, profile?.jwt]
  );

  useEffect(() => {
    refreshContacts();
  }, [refreshContacts, workspace.activeBusinessId, workspace.mode]);

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
