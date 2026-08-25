import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { buildShareLabels } from '../lib/gapUi';
import type { GapShareResponseDTO } from '../types/gap';

interface GapManualQueueModalProps {
  visible: boolean;
  shares: GapShareResponseDTO[];
  saving: boolean;
  /** Servis xatosi — modalka ichida ko'rsatiladi, ekran ortida emas. */
  serverError?: string;
  onClose: () => void;
  onSubmit: (shareIdsInOrder: string[]) => void;
}

/**
 * Navbatni QO'LDA belgilash (kelishuv bo'yicha).
 *
 * Har bir ulush yoniga navbat raqami kiritiladi. Avval bu tugma shunchaki
 * ro'yxatning joriy tartibini yuborardi — bu "kelishuv bo'yicha" degani emas
 * edi: tashkilotchi kimning nechanchi ekanini ko'rsata olmasdi.
 *
 * Tekshiruv mijozda ham qilinadi (1..N, takrorlanmasin), lekin oxirgi so'z
 * baribir bazada: unique(group_id, queue_position) qoidasi buzilishga yo'l
 * qo'ymaydi.
 */
const GapManualQueueModal: React.FC<GapManualQueueModalProps> = ({
  visible,
  shares,
  saving,
  serverError,
  onClose,
  onSubmit,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useI18n();

  const [positions, setPositions] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  // Oyna ochilganda mavjud navbat bilan to'ldiriladi — tashkilotchi noldan
  // emas, hozirgi holatdan boshlab tuzatadi.
  useEffect(() => {
    if (!visible) return;
    const initial: Record<string, string> = {};
    shares.forEach((share, index) => {
      initial[share.id] = String(share.queuePosition ?? index + 1);
    });
    setPositions(initial);
    setError('');
  }, [visible, shares]);

  const total = shares.length;
  const labels = useMemo(() => buildShareLabels(shares), [shares]);

  const handleSubmit = () => {
    const entries = shares.map((share) => ({
      id: share.id,
      raw: (positions[share.id] ?? '').trim(),
    }));

    if (entries.some((item) => item.raw === '')) {
      setError(t('gap.queue.errorIncomplete'));
      return;
    }

    const parsed = entries.map((item) => ({ id: item.id, value: Number(item.raw) }));
    if (parsed.some((item) => !Number.isInteger(item.value) || item.value < 1 || item.value > total)) {
      setError(t('gap.queue.errorRange', { total }));
      return;
    }

    const seen = new Set<number>();
    for (const item of parsed) {
      if (seen.has(item.value)) {
        setError(t('gap.queue.errorDuplicate', { value: item.value }));
        return;
      }
      seen.add(item.value);
    }

    setError('');
    const ordered = [...parsed].sort((a, b) => a.value - b.value).map((item) => item.id);
    onSubmit(ordered);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('gap.queue.manualTitle')}</Text>
          <Text style={styles.hint}>{t('gap.queue.manualHint', { total })}</Text>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {shares.map((share) => (
              <View key={share.id} style={styles.row}>
                <Text style={styles.name} numberOfLines={1}>
                  {labels[share.id]}
                </Text>
                <TextInput
                  value={positions[share.id] ?? ''}
                  onChangeText={(value) =>
                    setPositions((prev) => ({ ...prev, [share.id]: value.replace(/[^0-9]/g, '') }))
                  }
                  keyboardType="numeric"
                  maxLength={String(total).length}
                  style={styles.input}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            ))}
          </ScrollView>

          {error || serverError ? (
            <Text style={styles.error}>{error || serverError}</Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              title={t('common.cancel')}
              onPress={onClose}
              variant="secondary"
              style={styles.actionButton}
            />
            <Button
              title={t('common.save')}
              onPress={handleSubmit}
              loading={saving}
              style={styles.actionButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.lg,
      maxHeight: '85%',
    },
    handle: {
      alignSelf: 'center',
      width: 42,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.outline,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
      marginBottom: spacing.sm,
    },
    list: {
      marginBottom: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    name: {
      ...typography.body,
      color: colors.textPrimary,
      flex: 1,
    },
    input: {
      width: 64,
      height: 44,
      borderWidth: 1.5,
      borderColor: colors.outline,
      borderRadius: radius.md,
      textAlign: 'center',
      color: colors.textPrimary,
      backgroundColor: colors.surfaceMuted,
      fontSize: 16,
      fontWeight: '700',
    },
    error: {
      ...typography.bodySmall,
      color: colors.danger,
      marginBottom: spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionButton: { flex: 1 },
  });

export default GapManualQueueModal;
