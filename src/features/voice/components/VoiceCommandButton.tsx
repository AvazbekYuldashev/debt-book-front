import React, { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { useVoiceInput } from '../model/useVoiceInput';
import VoiceNoticeModal from './VoiceNoticeModal';
import type { VoiceIntent } from '../api/voice';

export interface VoiceCommandButtonProps {
  accountType?: string;
  token?: string;
  onResult: (intent: VoiceIntent) => void;
}

/**
 * Bosh ekranning yuqori qatoridagi ovozli buyruq tugmasi.
 *
 * NEGA BU YERDA: forma ichidagi tugma topilishi uchun avval oynani ochish
 * kerak edi — ya'ni foydalanuvchi kim bilan oldi-berdi qilishini allaqachon
 * tanlab bo'lgan bo'lardi. Holbuki ovozli buyruqning butun ma'nosi shu
 * qadamlarni tashlab o'tishda: "Aliga ellik ming berdim" deyish, kontaktni
 * qidirib o'tirmaslik.
 *
 * Ko'rinishi bildirishnoma tugmasi bilan BIR XIL (48x48, shisha sirt) —
 * ular yonma-yon turadi va o'lchami farq qilsa qator qiyshiq ko'rinardi.
 */
const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({ accountType, token, onResult }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const voice = useVoiceInput({ kind: 'TRANSACTION', accountType, token, onResult });

  // Qurilma yozib olmasa tugma umuman chiqmaydi — Android ilovasida
  // hozircha shunday.
  if (!voice.supported) return null;

  const recording = voice.state === 'recording';
  const working = voice.state === 'working';

  return (
    <View>
      <Pressable
        onPress={recording ? voice.stop : voice.start}
        disabled={working}
        accessibilityRole="button"
        accessibilityLabel={recording ? t('voice.stop') : t('voice.speak')}
        style={({ pressed }) => [styles.button, recording && styles.recording, pressed && styles.pressed]}
      >
        {working ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={recording ? 'stop-circle' : 'mic'}
            size={22}
            color={recording ? colors.danger : colors.primary}
          />
        )}
      </Pressable>

      {/* Xato OYNADA ko'rsatiladi. Ilgari u tugma ostidagi kichik yozuv edi:
          yuqori qatorga sig'masdi va ko'rinmay qolardi — foydalanuvchi
          tugmani bosib, hech narsa bo'lmagandek his qilardi. */}
      <VoiceNoticeModal error={voice.error} onClose={voice.clearError} />
    </View>
  );
};

const createStyles = ({ colors, radius, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    button: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      ...glass.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.card,
    },
    recording: {
      borderWidth: 2,
      borderColor: colors.danger,
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default memo(VoiceCommandButton);
