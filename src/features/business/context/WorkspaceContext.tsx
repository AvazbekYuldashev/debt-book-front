import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { AuthContext } from '../../auth/context/AuthContext';
import { BusinessRole, WorkspaceState } from '../types/business';
import { setBusinessAccessDeniedHandler } from '../../../shared/api/apiClient';
import { WORKSPACE_STORAGE_KEY, setActiveBusinessId } from '../../../shared/api/workspaceHeaders';
import { storage } from '../../../shared/lib/storage';

const PERSONAL_WORKSPACE: WorkspaceState = {
  mode: 'personal',
  activeBusinessId: null,
  activeBusinessName: null,
  activeBusinessRole: null,
};

interface WorkspaceContextValue {
  workspace: WorkspaceState;
  isWorkspaceReady: boolean;
  setPersonalWorkspace: () => void;
  setBusinessWorkspace: (input: { id: string; name: string; role: BusinessRole }) => void;
  clearWorkspace: () => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: PERSONAL_WORKSPACE,
  isWorkspaceReady: false,
  setPersonalWorkspace: () => {},
  setBusinessWorkspace: () => {},
  clearWorkspace: () => {},
});

async function readWorkspaceFromStorage(): Promise<WorkspaceState> {
  try {
    const raw = await storage.get(WORKSPACE_STORAGE_KEY);
    if (!raw) return PERSONAL_WORKSPACE;
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    if (parsed.mode === 'business' && parsed.activeBusinessId) {
      return {
        mode: 'business',
        activeBusinessId: parsed.activeBusinessId,
        activeBusinessName: parsed.activeBusinessName || null,
        activeBusinessRole: parsed.activeBusinessRole || null,
      };
    }
  } catch {
    // Ignore malformed persisted value and fallback to personal mode.
  }
  return PERSONAL_WORKSPACE;
}

function persistWorkspace(nextWorkspace: WorkspaceState) {
  storage.set(WORKSPACE_STORAGE_KEY, JSON.stringify(nextWorkspace));
}

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState<WorkspaceState>(PERSONAL_WORKSPACE);
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await readWorkspaceFromStorage();
      if (cancelled) return;
      // Birinchi so'rovdan oldin header to'g'ri bo'lishi uchun sinxron o'rnatamiz.
      setActiveBusinessId(restored.mode === 'business' ? restored.activeBusinessId : null);
      setWorkspace(restored);
      setIsWorkspaceReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Workspace o'rnatishning yagona nuqtasi: faol biznes id'sini SINXRON yangilaymiz.
  // Ilgari bu alohida useEffect([workspace]) ichida edi. React passiv effektlarni
  // farzanddan-otaga tartibda ishlatgani uchun, ContactsContext (farzand) effekti
  // bu ota-effektdan OLDIN ishlab, eski X-Business-ID bilan so'rov yuborardi —
  // natijada workspace almashganda eski (business) data ko'rinib qolardi.
  const applyWorkspace = useCallback((next: WorkspaceState) => {
    setActiveBusinessId(next.mode === 'business' ? next.activeBusinessId : null);
    setWorkspace(next);
    persistWorkspace(next);
  }, []);

  const clearWorkspace = useCallback(() => {
    applyWorkspace(PERSONAL_WORKSPACE);
  }, [applyWorkspace]);

  const setPersonalWorkspace = useCallback(() => {
    applyWorkspace(PERSONAL_WORKSPACE);
  }, [applyWorkspace]);

  const setBusinessWorkspace = useCallback((input: { id: string; name: string; role: BusinessRole }) => {
    applyWorkspace({
      mode: 'business',
      activeBusinessId: input.id,
      activeBusinessName: input.name,
      activeBusinessRole: input.role,
    });
  }, [applyWorkspace]);

  useEffect(() => {
    setBusinessAccessDeniedHandler(() => {
      clearWorkspace();
      Alert.alert('Business access error', 'Siz tanlangan business uchun ruxsatga ega emassiz. Personal workspace qayta tiklandi.');
    });
    return () => {
      setBusinessAccessDeniedHandler(null);
    };
  }, [clearWorkspace]);

  useEffect(() => {
    if (!profile?.jwt) {
      clearWorkspace();
    }
  }, [clearWorkspace, profile?.jwt]);

  const value = useMemo(
    () => ({
      workspace,
      isWorkspaceReady,
      setPersonalWorkspace,
      setBusinessWorkspace,
      clearWorkspace,
    }),
    [workspace, isWorkspaceReady, setPersonalWorkspace, setBusinessWorkspace, clearWorkspace]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
