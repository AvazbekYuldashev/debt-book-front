export const WORKSPACE_STORAGE_KEY = 'debt-book.workspace.state';
export const BUSINESS_HEADER_KEY = 'X-Business-ID';

// ============================================================
//  Faol biznes id'sini XOTIRADA saqlaymiz.
//  apiClient interceptor undan SINXRON o'qiydi — bu web va Android'da bir xil ishlaydi.
//  (localStorage'ni sinxron o'qib bo'lmaydi, Android'da u umuman yo'q.)
//  WorkspaceContext workspace o'zgarganда setActiveBusinessId(...) chaqiradi.
// ============================================================
let activeBusinessId: string | null = null;

export function setActiveBusinessId(id: string | null): void {
  activeBusinessId = id && id.trim() ? id.trim() : null;
}

export function getActiveBusinessId(): string | null {
  return activeBusinessId;
}
