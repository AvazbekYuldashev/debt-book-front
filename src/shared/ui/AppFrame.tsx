import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

/** Yig'ilgan ustun eni: uzun ro'yxatlar uchun qulay, cho'zilib ketmaydigan. */
const COLUMN_WIDTH = 560;

/**
 * Ilovani keng ekranda markazlashtirilgan ustunga yig'adi.
 *
 * Bu mobil ilova: barcha ekranlar bitta ustunga mo'ljallangan. Brauzerda u
 * butun monitor eniga cho'zilib, kirish maydonlari 900px bo'lib ketardi,
 * ro'yxat qatorlarida esa ism chapda, summa o'ng chetda — orasi bo'm-bo'sh.
 *
 * Cheklov FAQAT CSS orqali: `maxWidth` tor ekranda o'z-o'zidan ta'sir
 * qilmaydi, shuning uchun telefonda hech narsa o'zgarmaydi va JS bilan
 * ekran o'lchash kerak emas. Ilgari bu `useWindowDimensions()` sharti bilan
 * qilingandi va brauzerda ishlamay qoldi — o'lchov qaytargan qiymat
 * kutilganidan boshqa edi.
 *
 * Ataylab desktop uchun alohida (yon menyu, ko'p ustunli) maket qilinmadi:
 * u boshqa ilova bo'lib qolardi va har ekranni qaytadan loyihalashni talab
 * qilardi. Markazlashtirilgan ustun — halol va tanish yechim.
 */
const AppFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <View style={styles.page}>
      <View style={styles.column}>{children}</View>
    </View>
  );
};

const createStyles = ({ colors }: ThemeValue) =>
  StyleSheet.create({
    page: {
      flex: 1,
      alignItems: 'center',
      // Ustun tashqarisi biroz to'qroq — ustun "varaq" bo'lib ajralib tursin.
      // Tor ekranda bu fon ko'rinmaydi: ustun butun enni egallaydi.
      backgroundColor: colors.surfaceMuted,
    },
    column: {
      flex: 1,
      width: '100%',
      maxWidth: COLUMN_WIDTH,
      backgroundColor: colors.background,
      // Chegara emas, soya: ustun ekranga teng bo'lganda soya ko'rinmaydi,
      // chegara esa telefon brauzerida chetlarda ingichka chiziq qoldirardi.
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.10,
      shadowRadius: 24,
    },
  });

export default AppFrame;
