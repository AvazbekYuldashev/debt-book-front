import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Modal from '../../../shared/ui/AppModal';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import type { VoiceCommand } from '../model/voiceCommand';
import { formatDuration, formatSum, formatWhen } from '../model/formatUsage';
import { commandCost, tokenCost, type ModelPricing } from '../model/spend';

export interface UsageDetailModalProps {
  command: VoiceCommand | null;
  onClose: () => void;
  /**
   * Model tarifi va dollar kursi - serverdan.
   *
   * Qatorda tushunishning faqat UMUMIY narxi saqlanadi; kirish va
   * chiqishni alohida ko'rsatish uchun tarif kerak. Yo'q bo'lsa (eski
   * server) faqat umumiy narx ko'rsatiladi.
   */
  pricing?: ModelPricing | null;
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
const UsageDetailModal: React.FC<UsageDetailModalProps> = ({ command, onClose, pricing }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!command) return null;

  const { stt, model } = command;

  // Narx MODAL ham, ro'yxat qatori ham bir joydan o'qiydi.
  const { model: modelCost, total: totalCost } = commandCost(command, pricing);

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
                {/* Narx nol bo'lsa "0 so'm" EMAS: u "bepul" degan
                    taassurot qoldirardi. Nol - tarif yoki kurs yo'qligi,
                    ya'ni hisoblab bo'lmagani. */}
                <Text style={styles.partCost}>
                  {modelCost > 0 ? formatSum(modelCost) : t('usage.rateUnknown')}
                </Text>
              </View>

              {/* Tafsilot BERILMAYDI: tushunish narxi yuqoridagi
                  sarlavhada turibdi, uni kirish va chiqishga ajratish
                  foydalanuvchiga hech narsa bermaydi - u bitta ovoz
                  uchun qancha to'laganini bilsa kifoya. */}
            </View>
          ) : null}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('usage.cost')}</Text>
            <Text style={styles.totalValue}>{formatSum(totalCost)}</Text>
          </View>

          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    // Boshqa dialoglar bilan bitta retsept: qoraytirish + xiralashtirish.
    // Faqat overlay rangi ortdagi ro'yxat summalarini o'qiladigan qoldirib,
    // diqqatni bo'lardi.
    backdrop: {
      flex: 1,
      ...glass.scrim,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    // glass.modal - QAT'IY yopiq sirt (native'da blur yo'q): raqamlar har
    // qanday fon ustida o'qiladi. Chegara va soya ham tokendan.
    card: {
      width: '100%',
      maxWidth: 380,
      ...glass.modal,
      borderRadius: radius.lg,
      padding: spacing.lg,
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
