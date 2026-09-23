import React, { memo, useEffect } from 'react';
import IconButton from '../../../shared/ui/IconButton';
import { useAppTheme } from '../../../shared/theme';
import { useI18n } from '../../../shared/i18n';
import { useVoiceInput } from '../model/useVoiceInput';
import type { VoiceIntent, VoiceIntentKind } from '../api/voice';

export interface VoiceMicButtonProps {
  kind: VoiceIntentKind;
  accountType?: string;
  token?: string;
  /** Gap tushunilgach chaqiriladi. Maydonni TO'LDIRADI, saqlamaydi. */
  onResult: (intent: VoiceIntent) => void;
  /** Xato matni — maydon o'z xato qatorida ko'rsatishi uchun. */
  onError?: (message: string | null) => void;
}

/**
 * Mikrofon tugmasi.
 *
 * Bosilganda yoza boshlaydi, yana bosilganda to'xtaydi. BOSIB TURISH emas:
 * bosib turish barmoqni band qiladi va uzun gapda qo'l toladi, bir marta
 * bosish esa telefonni stolga qo'yib gapirish imkonini beradi.
 *
 * Tugma qurilma yozib olishni qo'llab-quvvatlamasa UMUMAN chiqmaydi.
 * Hozircha bu Android ilovasini bildiradi — u yerda native modul kerak.
 */
const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  kind,
  accountType,
  token,
  onResult,
  onError,
}) => {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const voice = useVoiceInput({ kind, accountType, token, onResult });

  const { error } = voice;
  useEffect(() => {
    if (!onError) return;
    if (!error) {
      onError(null);
      return;
    }
    // Server xabari tayyor, o'zimizniki tarjima qilinadi.
    onError(error.message ?? t(error.key ?? 'voice.failed'));
  }, [error, onError, t]);

  if (!voice.supported) return null;

  const recording = voice.state === 'recording';

  return (
    <IconButton
      name={recording ? 'stop-circle' : 'mic-outline'}
      onPress={recording ? voice.stop : voice.start}
      loading={voice.state === 'working'}
      // Yozayotganda qizil: mikrofon ochiqligi bir qarashda bilinishi kerak.
      color={recording ? colors.danger : undefined}
      accessibilityLabel={recording ? t('voice.stop') : t('voice.speak')}
    />
  );
};

export default memo(VoiceMicButton);
