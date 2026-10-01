import React, { memo, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import type { VoiceCommand } from '../model/voiceCommand';
import { formatDuration, formatSum, formatWhen } from '../model/formatUsage';

export interface UsageDetailModalProps {
  command: VoiceCommand | null;
  onClose: () => void;
}

/** Baytni o'qiladigan ko'rinishga: "81 KB". */
const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

/** Ming ajratilgan son: "1 250". */
const formatCount = (value: number): string =>
  String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/**
 * Bitta ovozli buyruqning tafsiloti.
 *
 * NEGA KERAK: ro'yxatda faqat yakuniy raqam turadi, lekin u QAYSI
 * QISMLARDAN yig'ilgani ko'rinmaydi. Buyruq ikki xizmatga tushadi va
 * ular turlicha hisoblanadi: ovozni tanish daqiqaga, gapni tushunish
 * esa tokenga. Qaysi biri qimmatga tushayotganini bilish uchun ularni
 * alohida ko'rsatish kerak.
 */
const UsageDetailModal: React.FC<UsageDetailModalProps> = ({ command, onClose }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!command) return null;

  const { stt, model } = command;
  const tokens = model ? model.promptTokens + model.completionTokens : 0;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Karta ichidagi bosish oynani yopmasin. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.titleRow}>
            <Ionicons name="mic-outline" size={20} color={colors.primary} />
            <Text style={styles.title}>{t('usage.commandTitle')}</Text>
          </View>
          <Text style={styles.when}>{formatWhen(command.at)}</Text>

          {/* ---------- ovozni tanish ---------- */}
          {stt ? (
            <View style={styles.part}>
              <View style={styles.partHead}>
                <Ionicons name="mic-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.partTitle}>{t('usage.sttTitle')}</Text>
                <Text style={styles.partCost}>{formatSum(stt.cost)}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('usage.duration')}</Text>
                <Text style={styles.rowValue}>{formatDuration(stt.durationMs)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('usage.size')}</Text>
                <Text style={styles.rowValue}>{formatSize(stt.sizeBytes)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('usage.rate')}</Text>
                <Text style={styles.rowValue}>
                  {formatSum(stt.ratePerMinute)} / {t('usage.minute')}
                </Text>
              </View>
            </View>
          ) : null}

          {/* ---------- gapni tushunish ---------- */}
          {model ? (
            <View style={styles.part}>
              <View style={styles.partHead}>
                <Ionicons name="sparkles-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.partTitle}>{t('usage.modelTitle')}</Text>
                {/* Tarif sozlanmaganda nol emas, izoh - "bepul" degan
                    taassurot qolmasligi uchun. */}
                <Text style={styles.partCost}>
                  {model.cost === 0 ? t('usage.rateUnknown') : formatSum(model.cost)}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('usage.inputTokens')}</Text>
                <Text style={styles.rowValue}>{formatCount(model.promptTokens)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('usage.outputTokens')}</Text>
                <Text style={styles.rowValue}>{formatCount(model.completionTokens)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('usage.totalTokens')}</Text>
                <Text style={styles.rowValue}>{formatCount(tokens)}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('usage.cost')}</Text>
            <Text style={styles.totalValue}>{formatSum(command.cost)}</Text>
          </View>

          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
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
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      ...shadows.card,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    title: {
      ...typography.heading3,
      color: colors.textPrimary,
    },
    when: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    part: {
      marginTop: spacing.md,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    partHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    partTitle: {
      ...typography.body,
      color: colors.textPrimary,
      flex: 1,
    },
    partCost: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.xxs,
    },
    rowLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    rowValue: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    totalValue: {
      ...typography.heading3,
      color: colors.textPrimary,
    },
    close: {
      alignSelf: 'flex-end',
      marginTop: spacing.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    closeText: {
      ...typography.button,
      color: colors.primary,
    },
  });

export default memo(UsageDetailModal);
