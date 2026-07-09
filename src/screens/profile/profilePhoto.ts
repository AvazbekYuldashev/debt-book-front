import { API_BASE } from '../../api/baseUrl';

// Attach-rasm ID'sidan app'ning kanonik ochilish URL'ini quradi.
export function buildProfilePhotoUrl(photoId?: string): string {
  const normalized = (photoId || '').trim();
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
 * qaytaradi — u foydalanuvchi brauzeridan ochilmaydi. Attach-rasm URL'ini HAR DOIM
 * app'ning kanonik manziliga (API_BASE) keltiramiz: web'da nisbiy (Apache /api proxy),
 * mobil'da to'liq URL.
 */
export function normalizeBackendPhotoUrl(url?: string): string {
  const raw = (url || '').trim();
  if (!raw) return '';

  const marker = '/attach/open/';
  const markerIdx = raw.indexOf(marker);
  if (markerIdx !== -1) {
    const after = raw.slice(markerIdx + marker.length);
    const fileId = after.split('?')[0].split('#')[0];
    if (fileId) return buildProfilePhotoUrl(fileId);
  }

  const apiOrigin = getApiOrigin();
  if (apiOrigin && raw.startsWith('/')) return `${apiOrigin}${raw}`;
  return raw;
}
