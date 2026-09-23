import React, { memo, useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import type { VoiceContactOption, VoiceDirection } from '../api/voice';
import type { VoiceCommand } from '../model/resolveVoiceCommand';

export interface VoiceResultModalProps {
  command: VoiceCommand | null;
  transcript: string;
  options: VoiceContactOption[];
  onPickContact: (contactId: string) => void;
  onPickDirection: (direction: VoiceDirection) => void;
  onClose: () => void;
}

/**
 * Ovozli buyruq to'liq tushunilmaganda chiqadigan oyna.
 *
 * Dastur TAXMIN QILMAGANDA foydalanuvchi nima bo'lganini ko'rishi kerak —
 * aks holda tugmani bosib, hech narsa bo'lmaganini ko'rib, ilova buzilgan
 * deb o'ylardi. Shuning uchun bu yerda avval "eshitganim" ko'rsatiladi:
 * odam o'z gapini o'qib, nima noto'g'ri ketganini o'zi tushunadi.
 *
 * Tanlov har doim ODAMNIKI. Ikkita Ali mos kelganda birinchisini olish —
 * qarzni begona yozuvga yozish demak.
 */
const VoiceResultModal: React.FC<VoiceResultModalProps> = ({
  command,
  transcript,
  options,
  onPickContact,
  onPickDirection,
  onClose,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const visible = command !== null && command.kind !== 'OPEN_CONTACT';
  if (!command || !visible) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Karta ichidagi bosish oynani yopmasin. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.titleRow}>
            <Ionicons name="mic" size={18} color={colors.primary} />
            <Text style={styles.title}>{t('voice.result')}</Text>
          </View>

          {transcript ? (
            <View style={styles.heardBox}>
              <Text style={styles.heardLabel}>{t('voice.heard')}</Text>
              <Text style={styles.heard}>{transcript}</Text>
            </View>
          ) : null}

          {command.kind === 'CHOOSE_CONTACT' ? (
            <>
              <Text style={styles.question}>{t('voice.whichPerson')}</Text>
              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {options.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() => onPickContact(option.id)}
                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  >
                    <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.optionText} numberOfLines={1}>
                      {option.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          {command.kind === 'ASK_DIRECTION' ? (
            <>
              <Text style={styles.question}>{t('voice.gaveOrTook')}</Text>
              <View style={styles.directionRow}>
                <Pressable
                  onPress={() => onPickDirection('TOOK')}
                  style={({ pressed }) => [styles.direction, styles.took, pressed && styles.optionPressed]}
                >
                  <Ionicons name="arrow-down" size={16} color={colors.textOnPrimary} />
                  <Text style={styles.directionText}>{t('contact.took')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => onPickDirection('GAVE')}
                  style={({ pressed }) => [styles.direction, styles.gave, pressed && styles.optionPressed]}
                >
                  <Ionicons name="arrow-up" size={16} color={colors.textOnPrimary} />
                  <Text style={styles.directionText}>{t('contact.gave')}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {command.kind === 'NO_CONTACT' ? (
            <Text style={styles.question}>{t('voice.personNotFound')}</Text>
          ) : null}

          <Pressable onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.optionPressed]}>
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
      color: colors.textPrimary,
    },
    heardBox: {
      backgroundColor: colors.gray50,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    heardLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    heard: {
      ...typography.body,
      color: colors.textPrimary,
    },
    question: {
      ...typography.body,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    list: {
      maxHeight: 220,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: spacing.xs,
    },
    optionPressed: {
      opacity: 0.6,
    },
    optionText: {
      ...typography.body,
      flexShrink: 1,
      color: colors.textPrimary,
    },
    directionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    direction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    took: {
      backgroundColor: colors.danger,
    },
    gave: {
      backgroundColor: colors.primary,
    },
    directionText: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textOnPrimary,
    },
    close: {
      alignSelf: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xs,
    },
    closeText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '600',
    },
  });

export default memo(VoiceResultModal);
