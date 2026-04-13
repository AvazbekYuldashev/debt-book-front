import * as Font from 'expo-font';
import { Platform } from 'react-native';

export const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export async function loadInterFonts(): Promise<void> {
  if (Platform.OS === 'web') {
    // Avoid remote font fetch errors in web dev; system fallback is used.
    return;
  }
  await Font.loadAsync({
    [fontFamily.regular]: {
      uri: 'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Regular.ttf',
      display: Font.FontDisplay.SWAP,
    },
    [fontFamily.medium]: {
      uri: 'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Medium.ttf',
      display: Font.FontDisplay.SWAP,
    },
    [fontFamily.semiBold]: {
      uri: 'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-SemiBold.ttf',
      display: Font.FontDisplay.SWAP,
    },
    [fontFamily.bold]: {
      uri: 'https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/Inter-Bold.ttf',
      display: Font.FontDisplay.SWAP,
    },
  });
}
