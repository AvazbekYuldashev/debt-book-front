import React, { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { useVoiceInput } from '../model/useVoiceInput';
import VoiceNoticeModal from './VoiceNoticeModal';
import type { VoiceIntent, VoiceIntentKind } from '../api/voice';

export interface VoiceBarProps {
  kind: VoiceIntentKind;
  accountType?: string;
  token?: string;
  onResult: (intent: VoiceIntent) => void;
}

/**
 * Forma boshidagi "Ovoz bilan to'ldirish" tugmasi.
 *
 * NEGA BU KERAK EDI: avval mikrofon maydon sarlavhasining chetida kichik
 * ikonka bo'lgan. U bor edi, lekin KO'RINMAS edi — foydalanuvchi oynani
 * ochmasdan turib topolmadi va "AI qayerda?" deb so'radi. Imkoniyat
 * topilmasa, yo'q bilan barobar.
 *
 * Shuning uchun u endi formaning eng tepasida, yozuvi bilan, butun kenglikda
 * turadi: oynani ochgan zahoti birinchi ko'rinadigan narsa.
 */
const VoiceBar: React.FC<VoiceBarProps> = ({ kind, accountType, token, onResult }) => {
  const theme = useAppTheme();
  const { colors, spacing, typography } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const voice = useVoiceInput({ kind, accountType, token, onResult });

  // Qurilma yozib olmasa tugma umuman chiqmaydi — Android ilovasida
  // hozircha shunday. Ishlamaydigan tugma ilova buzilgandek ko'rinardi.
  if (!voice.supported) return null;

  const recording = voice.state === 'recording';
  const working = voice.state === 'working';
  // Bu xatolar ko'rsatma talab qiladi va bir qatorga sig'maydi.
  const needsDialog = ['voice.permissionBlocked', 'voice.permissionDenied', 'voice.noMicrophone', 'voice.micBusy']
    .includes(voice.error?.key ?? '');

  const label = recording
    ? t('voice.listening')
    : working
      ? t('voice.processing')
      : t('voice.fillByVoice');

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Pressable
        onPress={recording ? voice.stop : voice.start}
        disabled={working}
        accessibilityRole="button"
        accessibilityLabel={recording ? t('voice.stop') : t('voice.speak')}
        style={({ pressed }) => [
          styles.bar,
          recording && styles.barRecording,
          pressed && styles.pressed,
        ]}
      >
        {working ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={recording ? 'stop-circle' : 'mic'}
            size={20}
            color={recording ? colors.danger : colors.primary}
          />
        )}
        <Text
          style={[
            typography.body,
            styles.label,
            { color: recording ? colors.danger : colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>

      {/* Ruxsat va qurilma masalalari qatorga sig'maydi — ular ko'rsatma
          bilan birga oynada chiqadi. Qolganlari joyida, maydon yonida. */}
      {needsDialog ? (
        <VoiceNoticeModal error={voice.error} onClose={voice.clearError} />
      ) : voice.error ? (
        <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>
          {voice.error.message ?? t(voice.error.key ?? 'voice.failed')}
        </Text>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing }: ThemeValue) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      borderWidth: 1.5,
      // Uzuq chiziq: bu maydon EMAS, balki maydonlarni to'ldiradigan amal.
      // To'liq chiziq bilan oddiy kiritish maydoniga o'xshab qolardi.
      borderStyle: 'dashed',
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    barRecording: {
      borderStyle: 'solid',
      borderColor: colors.danger,
      backgroundColor: colors.surfaceMuted,
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      flexShrink: 1,
      fontWeight: '600',
    },
  });

export default memo(VoiceBar);
