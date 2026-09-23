import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import WorkspaceSwitcher from '../../features/business/components/WorkspaceSwitcher';
import NotificationBell from '../../features/notifications/components/NotificationBell';
import VoiceCommandButton from '../../features/voice/components/VoiceCommandButton';
import type { VoiceIntent } from '../../features/voice/api/voice';
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
 *
 * Ovozli buyruq tugmasi FAQAT uni ishlata oladigan ekranda chiqadi:
 * natijada kerakli kontaktga o'tish kerak bo'ladi, bu esa Qarzlar
 * bo'limidan tashqarida ma'noga ega emas.
 */
interface ScreenTopBarProps {
  /** Berilsa — qo'ng'iroq yonida mikrofon tugmasi chiqadi. */
  onVoiceResult?: (intent: VoiceIntent) => void;
  voiceAccountType?: string;
  voiceToken?: string;
}

const ScreenTopBar: React.FC<ScreenTopBarProps> = ({ onVoiceResult, voiceAccountType, voiceToken }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <WorkspaceSwitcher />
      <View style={styles.tools}>
        {onVoiceResult ? (
          <VoiceCommandButton
            accountType={voiceAccountType}
            token={voiceToken}
            onResult={onVoiceResult}
          />
        ) : null}
        <NotificationBell />
      </View>
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
      paddingTop: spacing.xxs + 2,
    },
    tools: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
  });

export default memo(ScreenTopBar);
