import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import WorkspaceSwitcher from '../../features/business/components/WorkspaceSwitcher';
import NotificationBell from '../../features/notifications/components/NotificationBell';
import { useAppTheme } from '../../shared/theme';
import type { ThemeValue } from '../../shared/theme/ThemeProvider';

/**
 * Barcha bosh ekranlarning eng yuqori qatori: chapda ish maydoni
 * almashtirgichi, o'ngda bildirishnoma tugmasi.
 *
 * ATAYIN yagona komponent. Ilgari bu qator har ekranda alohida yozilgandi va
 * ular sekin-asta bir-biridan farq qila boshlagandi — tugma bir joyda
 * yuqoriga yopishib, boshqasida pastroqda turardi. Joylashuvni bitta joyda
 * saqlash — buni qayta takrorlanishidan himoya qiladi.
 *
 * Yuqoridan bo'shliq shu yerda beriladi: ekran konteyneri status bar
 * xavfsiz-zonasidan keyin darhol boshlanadi, qo'shimcha nafas joyisiz
 * tugma ekran chetiga qadalib qolardi.
 */
const ScreenTopBar: React.FC = () => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <WorkspaceSwitcher />
      <NotificationBell />
    </View>
  );
};

const createStyles = ({ spacing }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      // Chapdagi gorizontal chekinishni WorkspaceSwitcher o'zi beradi.
      paddingRight: spacing.md,
      paddingTop: spacing.sm,
    },
  });

export default memo(ScreenTopBar);
