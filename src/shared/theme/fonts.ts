import * as Font from 'expo-font';
import { Platform } from 'react-native';

// ============================================================
//  Professional UI shrifti: Inter.
//  WEB  : 'Inter' yagona oila — og'irlik (fontWeight) orqali boshqariladi.
//  MOBIL: har bir og'irlik alohida oila nomi bilan yuklanadi.
// ============================================================
const isWeb = Platform.OS === 'web';

export const fontFamily = {
  regular: isWeb ? 'Inter' : 'Inter-Regular',
  medium: isWeb ? 'Inter' : 'Inter-Medium',
  semiBold: isWeb ? 'Inter' : 'Inter-SemiBold',
  bold: isWeb ? 'Inter' : 'Inter-Bold',
} as const;

// Web fallback steki — Inter yuklanmaguncha tizim shrifti professional ko'rinadi.
export const WEB_FONT_STACK =
  "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';

export async function loadAppFonts(): Promise<void> {
  if (isWeb) {
    // Asosiy yo'l: font <link> web/index.html template'ida (bundle bilan parallel
    // yuklanadi). Bu yerdagi injektsiya faqat zaxira — masalan, kimdir template'siz
    // (eski web-build) deploy qilsa ham shrift baribir yuklanadi.
    if (typeof document !== 'undefined' && !document.getElementById('app-inter-font')) {
      const link = document.createElement('link');
      link.id = 'app-inter-font';
      link.rel = 'stylesheet';
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
    return;
  }

  await Font.loadAsync({
    'Inter-Regular': {
      uri: 'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Regular.ttf',
      display: Font.FontDisplay.SWAP,
    },
    'Inter-Medium': {
      uri: 'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Medium.ttf',
      display: Font.FontDisplay.SWAP,
    },
    'Inter-SemiBold': {
      uri: 'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-SemiBold.ttf',
      display: Font.FontDisplay.SWAP,
    },
    'Inter-Bold': {
      uri: 'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Bold.ttf',
      display: Font.FontDisplay.SWAP,
    },
  });
}
