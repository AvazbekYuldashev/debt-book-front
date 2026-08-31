import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatPhoneDisplay } from '../../../shared/lib/phone';
import type { GapMemberDTO } from '../types/gap';

interface GapReceiverPickerModalProps {
  visible: boolean;
  /** Navbati hali kelmagan a'zolar — faqat ular tanlanadi. */
  candidates: GapMemberDTO[];
  periodNumber: number;
  loading?: boolean;
  onClose: () => void;
  onPick: (shareId: string) => void;
}

/**
 * Joriy davrda kim kassani olishini tanlash.
 *
 * Ro'yxatda faqat navbati hali kelmaganlar bo'ladi: har bir ulush sikl
 * davomida bir marta oladi, shuning uchun olgan a'zo qayta chiqmaydi.
 */
const GapReceiverPickerModal: React.FC<GapReceiverPickerModalProps> = ({
  visible,
  candidates,
  periodNumber,
  loading,
  onClose,
  onPick,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>{t('gap.pickReceiverTitle')}</Text>
              <Text style={styles.subtitle}>
                {t('gap.periodShort', { period: String(periodNumber) })}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              style={styles.close}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {candidates.length === 0 ? (
              <Text style={styles.empty}>{t('gap.noCandidates')}</Text>
            ) : (
              candidates.map((member) => (
                <Pressable
                  key={member.shareId}
                  onPress={() => onPick(member.shareId)}
                  disabled={loading}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={member.memberName}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {member.memberName}
                      {member.me ? <Text style={styles.meTag}> · {t('gap.me')}</Text> : null}
                    </Text>
                    <Text style={styles.phone} numberOfLines={1}>
                      {formatPhoneDisplay(member.memberPhone ?? undefined, '—')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: radius.xl,
      padding: spacing.md,
      maxHeight: '75%',
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    close: {
      padding: 4,
    },
    list: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      ...typography.body,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    meTag: {
      fontWeight: '600',
      color: colors.primary,
    },
    phone: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    empty: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      padding: spacing.md,
    },
  });

export default GapReceiverPickerModal;
