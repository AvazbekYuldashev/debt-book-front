import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { AuthContext } from './AuthContext';
import { BusinessRole, WorkspaceState } from '../types/business';
import { setBusinessAccessDeniedHandler } from '../api/apiClient';
import { WORKSPACE_STORAGE_KEY } from '../api/workspaceHeaders';

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

function readWorkspaceFromStorage(): WorkspaceState {
  try {
    const raw = globalThis?.localStorage?.getItem(WORKSPACE_STORAGE_KEY);
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
  try {
    globalThis?.localStorage?.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(nextWorkspace));
  } catch {
    // Keep in-memory state if persistence fails.
  }
}

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState<WorkspaceState>(PERSONAL_WORKSPACE);
  const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);

  useEffect(() => {
    setWorkspace(readWorkspaceFromStorage());
    setIsWorkspaceReady(true);
  }, []);

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
