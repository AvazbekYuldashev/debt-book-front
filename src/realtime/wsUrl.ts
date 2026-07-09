// http(s) bazadan ws(s) URL yasaydi: protokol almashtiriladi, trailing slash tozalanadi.
export function toWebSocketUrl(httpBase: string, path: string): string {
  const base = httpBase.replace(/\/+$/, '');
  const wsBase = base.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${wsBase}${cleanPath}`;
}
