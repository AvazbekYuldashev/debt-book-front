import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { normalizePhone } from '../../../shared/lib/phone';

export interface GapMemberFormValue {
  name: string;
  phone?: string;
}

interface GapMemberFormModalProps {
  visible: boolean;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (value: GapMemberFormValue) => void;
}

/**
 * Guruhga a'zo qo'shish oynasi.
 *
 * Telefon ixtiyoriy: ro'yxatdan o'tmagan odam ham a'zo bo'la oladi —
 * u ism va telefon bilan yuritiladi (TZ 07).
 */
const GapMemberFormModal: React.FC<GapMemberFormModalProps> = ({
  visible,
  loading,
  error,
  onClose,
  onSubmit,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName('');
      setPhone('');
      setLocalError(null);
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      setLocalError(t('gap.errMemberName'));
      return;
    }
    setLocalError(null);
    onSubmit({
      name: name.trim(),
      phone: phone.trim() ? normalizePhone(phone) : undefined,
    });
  }, [name, phone, onSubmit, t]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Ichki bosishlar oynani yopmasligi uchun alohida Pressable. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('gap.addMemberTitle')}</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                style={styles.close}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Input label={t('gap.fieldMemberName')} value={name} onChangeText={setName} />
            <Input
              label={t('gap.fieldMemberPhone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Text style={styles.hint}>{t('gap.memberPhoneHint')}</Text>

            {localError || error ? (
              <Text style={styles.error}>{localError ?? error}</Text>
            ) : null}

            <Button title={t('gap.addMember')} onPress={handleSubmit} loading={loading} />
          </Pressable>
        </KeyboardAvoidingView>
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
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    close: {
      padding: 4,
    },
    hint: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      textAlign: 'center',
    },
  });

export default GapMemberFormModal;
