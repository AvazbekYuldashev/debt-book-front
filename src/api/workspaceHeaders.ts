import { WorkspaceState } from '../types/business';

export const WORKSPACE_STORAGE_KEY = 'debt-book.workspace.state';
export const BUSINESS_HEADER_KEY = 'X-Business-ID';

export function getWorkspaceFromStorage(): WorkspaceState | null {
  try {
    const raw = globalThis?.localStorage?.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    if (parsed.mode === 'business' && parsed.activeBusinessId) {
      return {
        mode: 'business',
        activeBusinessId: parsed.activeBusinessId,
        activeBusinessName: parsed.activeBusinessName || null,
        activeBusinessRole: parsed.activeBusinessRole || null,
      };
    }
    return {
      mode: 'personal',
      activeBusinessId: null,
      activeBusinessName: null,
      activeBusinessRole: null,
    };
  } catch {
    return null;
  }
}

export function getBusinessIdFromWorkspaceStorage(): string | null {
  const workspace = getWorkspaceFromStorage();
  if (!workspace || workspace.mode !== 'business') return null;
  return workspace.activeBusinessId;
}
