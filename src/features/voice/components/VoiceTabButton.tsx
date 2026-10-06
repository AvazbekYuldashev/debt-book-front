import React, { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { VOICE_BUTTON_SIZE } from '../../../shared/ui/fabLayout';
import { useI18n } from '../../../shared/i18n';
import { useVoiceInput } from '../model/useVoiceInput';
import { useVoiceAction } from '../model/VoiceActionProvider';
import VoiceNoticeModal from './VoiceNoticeModal';

/**
 * Pastki panelning o'rtasidagi ovozli buyruq tugmasi.
 *
 * NEGA PASTGA KO'CHDI: u yuqori qatorda, bildirishnoma qo'ng'irog'i
 * yonida turardi. Telefon kattalashgani sayin ekranning yuqori o'ng
 * burchagi barmoq yetmaydigan joyga aylandi, bu tugma esa ilovaning eng
 * tez-tez bosiladigan amali. Pastki panel markazi - ikkala qo'l uchun
 * ham eng qulay nuqta.
 *
 * KO'TARILGAN DOIRA, oddiy tab emas: u bo'lim emas, AMAL. Tab bosilsa
 * ekran almashadi, bu esa yozishni boshlaydi - shakli ham boshqacha
 * bo'lishi kerak, aks holda beshinchi bo'lim deb o'ylanardi.
 *
 * Ishlovchi ekrandan keladi (VoiceActionProvider). Joriy ekran ovozni
 * qabul qila olmasa, tugma O'CHIQ ko'rinadi: bosib, hech narsa
 * bo'lmaganini kutib turgandan ko'ra, bosib bo'lmasligi ko'rinib
 * turgani yaxshi.
 */
const VoiceTabButton: React.FC = () => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const action = useVoiceAction();
  const voice = useVoiceInput({
    kind: action?.kind ?? 'TRANSACTION',
    accountType: action?.accountType,
    token: action?.token,
    onResult: (intent) => action?.onResult(intent),
  });

  const recording = voice.state === 'recording';
  const working = voice.state === 'working';
  // Brauzerda yozib bo'lmasa `visible` yolg'on bo'ladi; tugma baribir
  // turadi va bosilganda sababini aytadi.
  const ready = Boolean(action) && voice.visible;
  const disabled = working || !ready;
  // O'chiq doira NEYTRAL sirtda - unda oq glif ko'rinmay qolardi.
  const glyphColor = ready ? colors.textOnPrimary : colors.textSecondary;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        /**
         * BOSIB TURIB GAPIRILADI, qo'yib yuborilganda to'xtaydi.
         *
         * Ilgari bosish yozishni boshlar, ikkinchi bosish to'xtatardi.
         * Odam gapirib bo'lgach tugmani qidirib topguncha bir necha
         * soniya o'tib ketar, o'sha jimlik esa ovoz uzunligiga qo'shilib,
         * pulga tushardi (tanish DAQIQASIGA to'lanadi).
         *
         * Barmoq uzilishi tabiiy chegara: odam gapirishni to'xtatgan
         * payt bilan yozuv tugashi ustma-ust tushadi.
         */
        onPressIn={voice.start}
        onPressOut={voice.stop}
        disabled={disabled}
        accessibilityRole="button"
        // Ekran o'quvchiga ham `disabled` prop bilan AYNAN bir xil holat
        // aytilsin: ishlov paytida tugma bosilmaydi.
        accessibilityState={{ disabled, busy: working }}
        accessibilityLabel={recording ? t('voice.stop') : t('voice.speak')}
        // Tartib muhim: yozuv paytida barmoq baribir bosib turadi - qizil
        // "pressed" rangidan keyin qo'yiladi, aks holda yashilga qaytardi.
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          recording && styles.recording,
          !ready && styles.off,
        ]}
      >
        {working ? (
          <ActivityIndicator color={glyphColor} />
        ) : (
          <Ionicons name={recording ? 'stop' : 'mic'} size={26} color={glyphColor} />
        )}
      </Pressable>

      {/* Xato OYNADA: panelda yozuv uchun joy yo'q va u ko'rinmay
          qolardi - foydalanuvchi tugmani bosib, hech narsa bo'lmagandek
          his qilardi. */}
      <VoiceNoticeModal error={voice.error} onClose={voice.clearError} />
    </View>
  );
};

const createStyles = ({ colors, shadows }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    /**
     * Panel chizig'idan YUQORIGA chiqadi: shu tufayli u qatorning bir
     * qismi emas, ustidagi alohida amal bo'lib o'qiladi.
     */
    button: {
      width: VOICE_BUTTON_SIZE,
      height: VOICE_BUTTON_SIZE,
      borderRadius: VOICE_BUTTON_SIZE / 2,
      marginTop: -VOICE_BUTTON_SIZE / 2,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.raised,
      shadowColor: colors.primary,
    },
    recording: {
      backgroundColor: colors.danger,
      shadowColor: colors.danger,
    },
    /**
     * Bosilgan holat RANG bilan, shaffoflik bilan emas: doira panel
     * chizig'ini kesib o'tadi va har qanday `opacity` ortidagi rasm bilan
     * panelni ikki xil tusda ko'rsatib, o'rtada chok qoldirardi.
     */
    pressed: {
      backgroundColor: colors.primaryPressed,
    },
    /**
     * O'CHIQ holat - SHAFFOF EMAS, neytral sirt.
     *
     * Ilgari butun doiraga `opacity: 0.4` berilardi: ortidan fon rasmi va
     * panel chizig'i ko'rinib, tugma ikki tusli "singan" dog'ga aylanardi,
     * oq glif esa 1.8:1 da o'qilmasdi. Shaffoflik "Yo'q" bo'lsa ham u
     * yagona shaffof element bo'lib qolardi.
     *
     * Endi u kartalar bilan bir xil to'liq sirt: hamma narsani yopadi,
     * glif textSecondary (o'qiladi, lekin "faol emas" deb ko'rinadi),
     * yashil nur esa yo'q - nur "bos meni" deydi.
     */
    off: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
    },
  });

export default memo(VoiceTabButton);
