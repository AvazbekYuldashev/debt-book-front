import { API_BASE } from '../../../shared/api/baseUrl';

export interface MobileVersionInfo {
  minVersionCode: number;
  latestVersionCode: number;
  updateUrl: string;
}

/**
 * Backenddan mobil ilova yangilanish ma'lumotini oladi (public endpoint).
 * Tarmoq xatosi yoki noto'g'ri javobda `null` qaytadi — bunda ilova
 * BLOKLANMAYDI (fail-open: yangilanish tekshiruvi ilovani ishdan chiqarmasin).
 */
export async function fetchMobileVersion(signal?: AbortSignal): Promise<MobileVersionInfo | null> {
  try {
    const res = await fetch(`${API_BASE}/mobile/version`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      minVersionCode: Number(data?.minVersionCode) || 0,
      latestVersionCode: Number(data?.latestVersionCode) || 0,
      updateUrl: typeof data?.updateUrl === 'string' ? data.updateUrl : '',
    };
  } catch {
    return null;
  }
}
