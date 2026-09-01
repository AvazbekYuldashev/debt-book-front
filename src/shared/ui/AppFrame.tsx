import React, { useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

/** Shundan keng ekranda ilova markazga yig'iladi. */
const WIDE_BREAKPOINT = 720;
/** Yig'ilgan ustun eni: uzun ro'yxatlar uchun qulay, cho'zilib ketmaydigan. */
const COLUMN_WIDTH = 560;

/**
 * Ilovani keng ekranda markazlashtirilgan ustunga yig'adi.
 *
 * Bu mobil ilova: barcha ekranlar bitta ustunga mo'ljallangan. Brauzerda u
 * butun monitor eniga cho'zilib, kirish maydonlari 900px bo'lib ketardi,
 * ro'yxat qatorlarida esa ism chapda, summa o'ng chetda — orasi bo'm-bo'sh.
 * O'qish uchun ham, ko'rinish uchun ham yomon.
 *
 * Telefonda (va tor oynada) hech narsa o'zgarmaydi — to'liq en.
 *
 * Ataylab desktop uchun alohida (yon menyu, ko'p ustunli) maket qilinmadi:
 * u boshqa ilova bo'lib qolardi va har ekranni qaytadan loyihalashni talab
 * qilardi. Markazlashtirilgan ustun — halol va tanish yechim.
 */
const AppFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();

  const framed = Platform.OS === 'web' && width > WIDE_BREAKPOINT;
  if (!framed) return <>{children}</>;

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
      backgroundColor: colors.surfaceMuted,
    },
    column: {
      flex: 1,
      width: '100%',
      maxWidth: COLUMN_WIDTH,
      backgroundColor: colors.background,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
  });

export default AppFrame;
