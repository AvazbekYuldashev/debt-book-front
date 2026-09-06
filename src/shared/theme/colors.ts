export interface ColorTokens {
  gray50: string;
  gray100: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  secondary: string;
  secondaryPressed: string;
  outline: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  textOnSecondary: string;
  // primary fon USTIDAGI yumshoq overlay (badge/chip) — textOnPrimary bilan uyg'un.
  onPrimarySoft: string;
  border: string;
  // Kartalar ostidagi soya rangi (shadowOpacity alohida beriladi) — juda quyuq
  // qora emas, ko'kimtir navy: "0 6px 24px rgba(30,50,80,.08)" ta'siri.
  shadow: string;
  danger: string;
  dangerMuted: string;
  success: string;
  warning: string;
  overlay: string;
  // Neytral-ma'lumot urg'usi (kategoriya badge'lari: "Biznes" va h.k.).
  info: string;
  infoSoft: string;
  // ---- Ambient fon (ilova "imzosi") ----
  // Fon TEKIS rang emas: asos ustida juda xira ko'k-yashil gradient va organik
  // shakllar turadi. Ranglar past alfa bilan beriladi — kontent bilan raqobat
  // qilmasligi shart (matn kontrasti buzilmaydi).
  ambientTint: string;
  ambientGreen: string;
  ambientBlue: string;
  ambientGlow: string;
  // Moliyaviy balans semantikasi: "haq/kredit" (musbat) va "qarz" (manfiy).
  // Brand 'primary' dan ATAYIN ajratilgan — ma'no boshqacha bo'lsa mustaqil o'zgaradi.
  positive: string;
  positiveSoft: string;
  negative: string;
  negativeSoft: string;
}

export const lightColors: ColorTokens = {
  gray50: '#F7F9FC',
  gray100: '#EEF2F8',
  primary: '#15803D',
  primaryPressed: '#116632',
  primarySoft: '#EBF7EF',
  secondary: '#E8A33D',
  secondaryPressed: '#CC8A28',
  outline: '#D7DFEC',
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F5FA',
  textPrimary: '#101C36',
  textSecondary: '#5C6C8A',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  onPrimarySoft: 'rgba(255, 255, 255, 0.22)',
  border: '#E7ECF4',
  shadow: '#1E3250',
  danger: '#C4384B',
  dangerMuted: '#FDEFF1',
  success: '#15803D',
  warning: '#9A6206',
  overlay: 'rgba(16, 28, 54, 0.45)',
  info: '#2E5FBF',
  infoSoft: '#E9EFFC',
  ambientTint: 'rgba(214, 228, 245, 0.55)',
  ambientGreen: 'rgba(21, 128, 61, 0.05)',
  ambientBlue: 'rgba(46, 95, 191, 0.045)',
  ambientGlow: 'rgba(255, 255, 255, 0.7)',
  positive: '#15803D',
  positiveSoft: '#EBF7EF',
  negative: '#C4384B',
  negativeSoft: '#FDEFF1',
};

export const darkColors: ColorTokens = {
  gray50: '#1B2740',
  gray100: '#243149',
  primary: '#4ADE80',
  primaryPressed: '#22C55E',
  primarySoft: '#14532D',
  secondary: '#FBBF24',
  secondaryPressed: '#F59E0B',
  outline: '#334155',
  background: '#0B1120',
  surface: '#162032',
  surfaceMuted: '#1E293B',
  textPrimary: '#E6ECF6',
  textSecondary: '#93A3BC',
  textOnPrimary: '#06240F',
  textOnSecondary: '#3A2A06',
  onPrimarySoft: 'rgba(5, 40, 20, 0.22)',
  border: '#2A3A52',
  shadow: '#000000',
  danger: '#F87171',
  dangerMuted: '#3A2121',
  success: '#34D399',
  warning: '#FBBF24',
  overlay: 'rgba(2, 6, 23, 0.70)',
  info: '#7FA9F0',
  infoSoft: '#1C2C4A',
  ambientTint: 'rgba(30, 48, 80, 0.45)',
  ambientGreen: 'rgba(74, 222, 128, 0.05)',
  ambientBlue: 'rgba(96, 145, 240, 0.05)',
  ambientGlow: 'rgba(120, 160, 215, 0.06)',
  positive: '#4ADE80',
  positiveSoft: '#14532D',
  negative: '#F87171',
  negativeSoft: '#3A2121',
};
