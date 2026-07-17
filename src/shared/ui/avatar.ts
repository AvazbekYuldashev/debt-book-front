// ============================================================
//  Avatar (initial doiracha) yordamchilari — ekranlar bo'ylab yagona manba.
//  Ismdan deterministik rang va bosh harflar.
// ============================================================

export const AVATAR_COLORS: { bg: string; fg: string }[] = [
  { bg: '#E0F2FE', fg: '#0369A1' },
  { bg: '#DCFCE7', fg: '#15803D' },
  { bg: '#FEF9C3', fg: '#A16207' },
  { bg: '#FCE7F3', fg: '#BE185D' },
  { bg: '#EDE9FE', fg: '#6D28D9' },
  { bg: '#FFEDD5', fg: '#C2410C' },
  { bg: '#D8F3DD', fg: '#1F8A3F' },
];

export const getInitials = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const pickAvatarColor = (seed: string): { bg: string; fg: string } => {
  let hash = 0;
  for (let i = 0; i < (seed || '').length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};
