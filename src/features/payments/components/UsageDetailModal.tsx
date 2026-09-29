import React, { memo, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import type { VoiceUsage } from '../api/usage';
import { formatDuration, formatSum, formatWhen } from '../model/formatUsage';

export interface UsageDetailModalProps {
  usage: VoiceUsage | null;
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
 * Bitta sarf yozuvining tafsiloti.
 *
 * NEGA KERAK: ro'yxatda faqat yakuniy raqam turadi, lekin u QAYERDAN
 * kelgani ko'rinmaydi. Ovoz tanishda bu davomiylik va tarif, modelda esa
 * kirish va chiqish tokenlari - ular alohida sanaladi va odatda turli
 * narxda bo'ladi.
 *
 * Ikki xil yozuv ikki xil ko'rsatiladi: bir xil jadvalga tiqishtirsak,
 * yarim maydoni bo'sh qatorlar chiqib, o'qish qiyinlashardi.
 */
const UsageDetailModal: React.FC<UsageDetailModalProps> = ({ usage, onClose }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!usage) return null;

  const isModel = usage.source === 'MODEL';
  const tokens = usage.promptTokens + usage.completionTokens;

  const rows: { label: string; value: string }[] = isModel
    ? [
        { label: t('usage.inputTokens'), value: formatCount(usage.promptTokens) },
        { label: t('usage.outputTokens'), value: formatCount(usage.completionTokens) },
        { label: t('usage.totalTokens'), value: formatCount(tokens) },
      ]
    : [
        { label: t('usage.duration'), value: formatDuration(usage.durationMs) },
        { label: t('usage.size'), value: formatSize(usage.sizeBytes) },
        { label: t('usage.rate'), value: `${formatSum(usage.ratePerMinute)} / ${t('usage.minute')}` },
      ];

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Karta ichidagi bosish oynani yopmasin. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.titleRow}>
            <Ionicons
              name={isModel ? 'sparkles-outline' : 'mic-outline'}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.title}>
              {isModel ? t('usage.modelTitle') : t('usage.sttTitle')}
            </Text>
          </View>

          <Text style={styles.when}>{formatWhen(usage.createdDate)}</Text>

          <View style={styles.rows}>
            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('usage.cost')}</Text>
            {/* Model tarifi hali sozlanmagan - nol o'rniga izoh, aks holda
                "bepul" degan taassurot qolardi. */}
            <Text style={styles.totalValue}>
              {isModel && usage.cost === 0 ? t('usage.rateUnknown') : formatSum(usage.cost)}
            </Text>
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
    rows: {
      marginTop: spacing.md,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.xs,
    },
    rowLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    rowValue: {
      ...typography.body,
      color: colors.textPrimary,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
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
