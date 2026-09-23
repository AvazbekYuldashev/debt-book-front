import React, { memo, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import type { VoiceError } from '../model/useVoiceInput';

export interface VoiceNoticeModalProps {
  error: VoiceError | null;
  onClose: () => void;
}

/**
 * Ovozli kiritish xatosini KO'RINADIGAN qilib aytadi.
 *
 * Ilgari xato yuqori paneldagi tugma ostida kichik yozuv edi. U qatorga
 * sig'masdi va ko'rinmay qolardi — foydalanuvchi tugmani bosib, hech narsa
 * bo'lmaganini ko'rib, "brauzer ruxsat so'ramayapti" deb o'ylardi. Sabab
 * bor edi, faqat aytilmasdi.
 *
 * Ruxsat bloklangan holat ALOHIDA: unda brauzer qayta so'ramaydi, shuning
 * uchun "ruxsat bering" deyishning foydasi yo'q — qayerdan ochish
 * kerakligini ko'rsatamiz.
 */
const VoiceNoticeModal: React.FC<VoiceNoticeModalProps> = ({ error, onClose }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!error) return null;

  // Qulf ko'rsatmasi FAQAT ruxsat masalasida foydali. Mikrofon yo'q
  // qurilmada "sozlamadan ruxsat bering" deyish odamni bekorga sarson
  // qilardi — u yerda ruxsatning aloqasi yo'q.
  const isPermission =
    error.key === 'voice.permissionBlocked' || error.key === 'voice.permissionDenied';
  const isDeviceIssue =
    error.key === 'voice.noMicrophone' ||
    error.key === 'voice.micBusy' ||
    error.key === 'voice.unsupportedBrowser';
  const text = error.message ?? t(error.key ?? 'voice.failed');

  const title = isPermission
    ? t('voice.permissionTitle')
    : isDeviceIssue
      ? t('voice.micProblemTitle')
      : t('voice.result');

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.titleRow}>
            <Ionicons
              name={isPermission || isDeviceIssue ? 'mic-off-outline' : 'alert-circle-outline'}
              size={20}
              color={colors.danger}
            />
            <Text style={styles.title}>{title}</Text>
          </View>

          <Text style={styles.message}>{text}</Text>

          {/* IKKI xil to'siq bor va ular turli joydan ochiladi. Faqat
              birinchisini aytgandim — foydalanuvchining brauzerida "Mikrofon"
              qatori umuman yo'q edi, chunki to'siq Android darajasida
              turgandi. Bitta yo'lni aytish odamni boshi berk ko'chaga
              olib borardi. */}
          {isPermission ? (
            <View style={styles.helpBox}>
              <Text style={styles.help}>{t('voice.permissionHelp')}</Text>
              <Text style={styles.help}>{t('voice.permissionHelpOs')}</Text>
              <Text style={styles.helpStrong}>{t('voice.permissionHelpReload')}</Text>
            </View>
          ) : null}

          {/* Texnik sabab — kichik va oxirida. Foydalanuvchiga emas,
              nosozlikni izlayotgan odamga kerak: usiz sabab faqat taxmin
              qilinardi. */}
          {error.detail ? <Text style={styles.detail}>{error.detail}</Text> : null}

          <Pressable onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      ...modalCardLayout,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      ...shadows.card,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    title: {
      ...typography.heading2,
      fontSize: 17,
      flexShrink: 1,
      color: colors.textPrimary,
    },
    message: {
      ...typography.body,
      color: colors.textPrimary,
    },
    helpBox: {
      backgroundColor: colors.gray50,
      borderRadius: radius.md,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    help: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    helpStrong: {
      ...typography.caption,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    detail: {
      ...typography.caption,
      fontSize: 11,
      textAlign: 'center',
      color: colors.textSecondary,
      opacity: 0.7,
    },
    close: {
      alignSelf: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    closeText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default memo(VoiceNoticeModal);
