import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceContactsSupported } from '../../../shared/lib/deviceContacts';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { normalizePhone } from '../../../shared/lib/phone';
import { modalCardLayout } from '../../../shared/ui/modalLayout';

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
  /** Telefon kontaktlaridan ko'plab a'zo tanlash oynasini ochadi. */
  onOpenDeviceContacts?: () => void;
}

/**
 * Guruhga a'zo qo'shish oynasi.
 *
 * Joylashuvi Qarzlar bo'limidagi oynalar bilan bir xil: yuqorida sarlavha,
 * o'rtada maydonlar, pastda "Bekor qilish" va asosiy tugma yonma-yon.
 *
 * Telefon ixtiyoriy: ro'yxatdan o'tmagan odam ham a'zo bo'la oladi —
 * u ism va telefon bilan yuritiladi (TZ 07).
 *
 * Bittalab kiritish uzoq bo'lgani uchun tepada telefon kontaktlaridan
 * ko'plab tanlash yo'li ham bor.
 */
const GapMemberFormModal: React.FC<GapMemberFormModalProps> = ({
  visible,
  loading,
  error,
  onClose,
  onSubmit,
  onOpenDeviceContacts,
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
              {t('gap.addMemberTitle')}
            </Text>

            {/* Brauzerda telefon daftariga kirish yo'q — tugma ko'rsatilsa
                ochilgan oyna doim "Kontakt topilmadi" deb turardi.
                Qarzlar bo'limidagi oyna ham aynan shunday tekshiradi. */}
            {onOpenDeviceContacts && deviceContactsSupported ? (
              <TouchableOpacity
                style={styles.deviceBtn}
                onPress={onOpenDeviceContacts}
                activeOpacity={0.8}
              >
                <Ionicons name="people-outline" size={18} color={colors.primary} />
                <Text style={styles.deviceBtnText}>{t('debts.fromPhoneContacts')}</Text>
              </TouchableOpacity>
            ) : null}

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

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={onClose}
                style={styles.actionBtn}
              />
              <Button
                title={t('gap.addMember')}
                onPress={handleSubmit}
                loading={loading}
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
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    deviceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
      marginBottom: spacing.sm,
    },
    deviceBtnText: {
      ...typography.button,
      color: colors.primary,
    },
    hint: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      marginBottom: spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
  });

export default GapMemberFormModal;
