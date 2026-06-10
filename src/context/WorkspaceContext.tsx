import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { AuthContext } from './AuthContext';
import { BusinessRole, WorkspaceState } from '../types/business';
import { setBusinessAccessDeniedHandler } from '../api/apiClient';
import { WORKSPACE_STORAGE_KEY, setActiveBusinessId } from '../api/workspaceHeaders';
import { storage } from '../utils/storage';

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
      setWorkspace(restored);
      setIsWorkspaceReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Faol biznes id'sini xotiraga sinxronlaymiz (apiClient interceptor shundan o'qiydi).
  useEffect(() => {
    setActiveBusinessId(workspace.mode === 'business' ? workspace.activeBusinessId : null);
  }, [workspace]);

  const clearWorkspace = useCallback(() => {
    setWorkspace(PERSONAL_WORKSPACE);
    persistWorkspace(PERSONAL_WORKSPACE);
  }, []);

  const setPersonalWorkspace = useCallback(() => {
    setWorkspace(PERSONAL_WORKSPACE);
    persistWorkspace(PERSONAL_WORKSPACE);
  }, []);

  const setBusinessWorkspace = useCallback((input: { id: string; name: string; role: BusinessRole }) => {
    const next: WorkspaceState = {
      mode: 'business',
      activeBusinessId: input.id,
      activeBusinessName: input.name,
      activeBusinessRole: input.role,
    };
    setWorkspace(next);
    persistWorkspace(next);
  }, []);

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
