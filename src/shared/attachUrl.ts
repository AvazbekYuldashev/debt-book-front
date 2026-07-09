import { API_BASE } from '../api/baseUrl';

// Attach-fayl (profil/biznes rasmi va h.k.) ID'sidan kanonik ochilish URL'ini quradi.
export function buildAttachUrl(fileId?: string): string {
  const normalized = (fileId || '').trim();
  if (!normalized) return '';
  return `${API_BASE}/attach/open/${normalized}`;
}

function getApiOrigin(): string {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return '';
  }
}

/**
 * Backend ba'zan ichki host (localhost:8080 / 127.0.0.1 / internal IP) bilan URL
 * qaytaradi — u foydalanuvchi brauzeridan ochilmaydi. Attach URL'ini HAR DOIM
 * app'ning kanonik manziliga (API_BASE) keltiramiz: web'da nisbiy (Apache /api proxy),
 * mobil'da to'liq URL.
 */
export function normalizeAttachUrl(url?: string): string {
  const raw = (url || '').trim();
  if (!raw) return '';

  const marker = '/attach/open/';
  const markerIdx = raw.indexOf(marker);
  if (markerIdx !== -1) {
    const after = raw.slice(markerIdx + marker.length);
    const fileId = after.split('?')[0].split('#')[0];
    if (fileId) return buildAttachUrl(fileId);
  }

  const apiOrigin = getApiOrigin();
  if (apiOrigin && raw.startsWith('/')) return `${apiOrigin}${raw}`;
  return raw;
}
