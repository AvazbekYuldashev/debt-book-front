import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useCreateGap } from '../hooks/useGap';
import GapUnitPicker from './GapUnitPicker';
import type { GapUnit } from '../types/gap';

interface GapCreateModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Yangi gap to'yona yaratish oynasi.
 *
 * Ilgari bu alohida EKRAN edi — ro'yxatdan chiqib, orqaga tugmasi bilan
 * qaytiladigan. Boshqa barcha yaratish/tahrirlash oynalari modal bo'lgani
 * uchun bittasi sahifa bo'lib turishi izchil emasdi.
 *
 * Forma ataylab qisqa: guruhga faqat nom va o'lchov birligi kerak. Badal,
 * to'lov kuni, navbat va qur'a degan narsalar yo'q — kim qachon va qancha
 * berishini a'zolar o'zlari hal qiladi. A'zolar ham bu yerda so'ralmaydi:
 * ularni qo'shish guruh ichidagi jarayon.
 */
const GapCreateModal: React.FC<GapCreateModalProps> = ({ visible, onClose }) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const createMutation = useCreateGap();

  const [name, setName] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<GapUnit | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Oyna har ochilganda toza forma: yopib qayta ochgan odam oldingi
  // kiritganini emas, bo'sh maydonni ko'rishi kerak.
  useEffect(() => {
    if (visible) {
      setName('');
      setSelectedUnit(null);
      setError(null);
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!name.trim()) return setError(t('gap.errName'));
    if (!selectedUnit) return setError(t('gap.errUnit'));

    createMutation.mutate(
      {
        name: name.trim(),
        unitType: selectedUnit.type,
        unitCode: selectedUnit.code,
        unitLabel: selectedUnit.label,
      },
      {
        // Yaratilgach ro'yxatga qaytamiz: yangi guruh boshida turadi va
        // foydalanuvchi uni o'zi ochadi.
        onSuccess: onClose,
        onError: (err) => setError((err as Error).message),
      }
    );
  }, [name, selectedUnit, createMutation, onClose, t]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">
              {t('gap.createTitle')}
            </Text>

            <Input label={t('gap.fieldName')} value={name} onChangeText={setName} />

            <GapUnitPicker value={selectedUnit} onChange={setSelectedUnit} resetKey={visible} />

            <Text style={styles.note}>{t('gap.membersLaterHint')}</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={onClose}
                style={styles.actionBtn}
              />
              <Button
                title={t('gap.createSubmit')}
                onPress={handleSubmit}
                loading={createMutation.isPending}
                style={styles.actionBtn}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
    },
    // Oyna yuqoriroqda ochilsin — klaviatura maydonlarni to'smasligi uchun.
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    card: {
      ...modalCardLayout,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    note: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
  });

export default GapCreateModal;
