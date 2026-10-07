import React, { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Modal from '../../../shared/ui/AppModal';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import type { VoiceGapMember } from '../api/voice';
import type { GapVoiceCommand } from '../model/resolveGapCommand';

export interface GapVoiceResultModalProps {
  command: GapVoiceCommand | null;
  transcript: string;
  onPickMember: (member: VoiceGapMember) => void;
  onClose: () => void;
}

/**
 * Gap kassada ovozli buyruq natijasi.
 *
 * Faqat dastur O'ZI QAROR QILA OLMAGANDA chiqadi. A'zo aniq bo'lsa oyna
 * umuman ko'rinmaydi — o'sha odamning ekrani ochiladi va ortiqcha qadam
 * bo'lmaydi.
 *
 * Kassa nomi har qatorda ko'rsatiladi: bir xil ismli ikki a'zoni aynan
 * shu ajratadi va usiz tanlov ma'nosiz bo'lardi.
 */
const GapVoiceResultModal: React.FC<GapVoiceResultModalProps> = ({
  command,
  transcript,
  onPickMember,
  onClose,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // A'zo topilgan bo'lsa ekran ochiladi — bu yerda ko'rsatadigan narsa yo'q.
  if (!command || command.kind === 'OPEN_MEMBER') return null;

  const choosing = command.kind === 'CHOOSE_MEMBER';

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Karta ichidagi bosish oynani yopmasin. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.titleRow}>
            <Ionicons name="mic-outline" size={20} color={colors.primary} />
            <Text style={styles.title}>{t('voice.result')}</Text>
          </View>

          {transcript ? (
            <View style={styles.heardBox}>
              <Text style={styles.heardLabel}>{t('voice.heard')}</Text>
              <Text style={styles.heard}>{transcript}</Text>
            </View>
          ) : null}

          <Text style={styles.question}>
            {choosing ? t('voice.whichMember') : t('voice.memberNotFound')}
          </Text>

          {choosing ? (
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {command.options.map((member) => (
                <Pressable
                  key={member.memberId}
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  onPress={() => onPickMember(member)}
                  accessibilityRole="button"
                  accessibilityLabel={`${member.memberName} — ${member.groupName}`}
                >
                  <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                  <View style={styles.optionText}>
                    <Text style={styles.optionName} numberOfLines={1}>
                      {member.memberName}
                    </Text>
                    {/* Bir xil ismni faqat kassa nomi ajratadi. */}
                    <Text style={styles.optionGroup} numberOfLines={1}>
                      {member.groupName}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.close, pressed && styles.optionPressed]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    // Scrim va karta ilovaning umumiy modal retseptidan: ikkala mavzuda,
    // fon rasmi ustida ham boshqa dialoglar bilan bir xil ko'rinadi.
    // Qattiq yozilgan qora parda yorug' mavzuda kirlangan kulrang berardi.
    backdrop: {
      flex: 1,
      ...glass.scrim,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      ...glass.modal,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    heardBox: {
      backgroundColor: colors.gray50,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
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
      marginBottom: spacing.sm,
    },
    list: {
      maxHeight: 260,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.md,
    },
    optionPressed: {
      opacity: 0.6,
    },
    optionText: {
      flex: 1,
    },
    optionName: {
      ...typography.body,
      color: colors.textPrimary,
    },
    optionGroup: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    close: {
      marginTop: spacing.sm,
      alignSelf: 'flex-end',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    closeText: {
      ...typography.body,
      color: colors.textSecondary,
    },
  });

export default memo(GapVoiceResultModal);
