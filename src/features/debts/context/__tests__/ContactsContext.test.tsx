import React, { ReactNode, useContext } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../api/clients', () => ({
  getMyClients: jest.fn(),
  createClient: jest.fn(),
  updateClient: jest.fn(),
  deleteClient: jest.fn(),
  filterClients: jest.fn(),
}));

import { getMyClients, createClient } from '../../api/clients';
import { ContactsContext, ContactsProvider } from '../ContactsContext';
import { AuthContext } from '../../../auth/context/AuthContext';
import { WorkspaceContext } from '../../../business/context/WorkspaceContext';

const mockedGetMyClients = getMyClients as jest.Mock;
const mockedCreateClient = createClient as jest.Mock;

const authValue = {
  profile: { id: 'me', jwt: 'token', name: 'Me', surname: '', username: '998900000000' },
  isAuthReady: true,
  setProfile: jest.fn(),
} as any;

const wsValue = {
  workspace: { mode: 'personal', activeBusinessId: null, activeBusinessName: null, activeBusinessRole: null },
  isWorkspaceReady: true,
  setPersonalWorkspace: jest.fn(),
  setBusinessWorkspace: jest.fn(),
  clearWorkspace: jest.fn(),
} as any;

// Yaratilgan QueryClient'lar test oxirida tozalanadi — aks holda cacheTime GC
// timerlari jest worker'ini ushlab turadi ("worker failed to exit" ogohlantirishi).
const activeQueryClients: QueryClient[] = [];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  activeQueryClients.push(queryClient);
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <WorkspaceContext.Provider value={wsValue}>
          <ContactsProvider>{children}</ContactsProvider>
        </WorkspaceContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  activeQueryClients.forEach((client) => client.clear());
  activeQueryClients.length = 0;
});

describe('ContactsContext (xulq kontrakti)', () => {
  it('mount paytida mijozlarni yuklaydi va map qiladi', async () => {
    mockedGetMyClients.mockResolvedValueOnce([
      { id: '1', name: 'Ali Valiyev', phoneNumber: '998901234567' },
    ]);

    const { result } = renderHook(() => useContext(ContactsContext), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.contacts).toHaveLength(1));
    expect(result.current.contacts[0].fullName).toBe('Ali Valiyev');
    expect(result.current.contacts[0].phone).toBe('998901234567');
    expect(mockedGetMyClients).toHaveBeenCalledTimes(1);
  });

  it('addContact yangi mijozni ro‘yxat boshiga qo‘shadi', async () => {
    mockedGetMyClients.mockResolvedValueOnce([]);
    mockedCreateClient.mockResolvedValueOnce({ id: '2', name: 'Yangi Mijoz', phoneNumber: '998900000000' });

    const { result } = renderHook(() => useContext(ContactsContext), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.addContact({ name: 'Yangi Mijoz', targetType: 'PROFILE', phone: '900000000' });
    });

    expect(ok).toBe(true);
    expect(mockedCreateClient).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.contacts.some((c) => c.fullName === 'Yangi Mijoz')).toBe(true));
  });

  it('noto‘g‘ri telefon bilan addContact xato beradi va API chaqirilmaydi', async () => {
    mockedGetMyClients.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useContext(ContactsContext), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.addContact({ name: 'X', targetType: 'PROFILE', phone: '123' });
    });

    expect(ok).toBe(false);
    expect(mockedCreateClient).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
});
