import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import Input from '../../components/atoms/Input';
import Button from '../../components/atoms/Button';
import PartyTypeSelector from '../../components/form/PartyTypeSelector';
import type { ContactFormInput } from '../../context/ContactsContext';
import type { PartyType } from '../../types/money';
import { getPhoneValidationError } from '../../utils/phone';
import { deviceContactsSupported } from '../../utils/deviceContacts';

type Mode = 'create' | 'edit';

interface ContactFormModalProps {
  visible: boolean;
  mode: Mode;
  initialName?: string;
  submitting: boolean;
  /** O'chirishga ruxsat: hisob to'liq yopiq (hech valyutada qarz/haq yo'q) bo'lsagina true. */
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
  onClose: () => void;
  onCreate: (input: ContactFormInput) => Promise<boolean>;
  onUpdate: (name: string) => Promise<boolean>;
  onOpenDeviceContacts: () => void;
}

const MAX_PHONE_DIGITS = 12;

/**
 * Kontakt qo'shish/tahrirlash modali. Forma holati va validatsiya (i18n xabarlari
 * bilan) shu yerda inkapsulyatsiya qilingan — ekran faqat `onCreate`/`onUpdate`ni
 * uzatadi va ochilish/yopilishni boshqaradi.
 */
const ContactFormModal: React.FC<ContactFormModalProps> = ({
  visible,
  mode,
  initialName,
  submitting,
  canDelete,
  deleting,
  onDelete,
  onClose,
  onCreate,
  onUpdate,
  onOpenDeviceContacts,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [targetType, setTargetType] = useState<PartyType>('PROFILE');
  const [targetBusinessId, setTargetBusinessId] = useState('');
  const [localError, setLocalError] = useState('');

  // Modal ochilganda maydonlarni rejim/boshlang'ich qiymatga tiklaymiz.
  useEffect(() => {
    if (!visible) return;
    setName(mode === 'edit' ? initialName ?? '' : '');
    setPhone('');
    setTargetType('PROFILE');
    setTargetBusinessId('');
    setLocalError('');
  }, [visible, mode, initialName]);

  const validate = useCallback((): string => {
    if (!name.trim()) return t('debts.enterName');
    if (mode === 'edit') return '';

    if (targetType === 'BUSINESS_ACCOUNT') {
      return targetBusinessId.trim() ? '' : t('debts.businessIdRequired');
    }

    const phoneError = getPhoneValidationError(phone);
    if (phoneError === 'empty') return t('debts.enterPhone');
    if (phoneError === 'prefix') return t('debts.phone998');
    if (phoneError === 'length') return t('debts.phoneLength');
    return '';
  }, [name, mode, targetType, targetBusinessId, phone, t]);

  const handleSubmit = useCallback(async () => {
    const error = validate();
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError('');

    if (mode === 'edit') {
      if (await onUpdate(name.trim())) onClose();
      return;
    }

    const input: ContactFormInput =
      targetType === 'BUSINESS_ACCOUNT'
        ? { name: name.trim(), targetType, targetBusinessId: targetBusinessId.trim() }
        : { name: name.trim(), targetType, phone: phone.replace(/\D/g, '') };

    const ok = await onCreate(input);
    if (ok) onClose();
    else if (targetType === 'PROFILE') setLocalError(t('debts.saveFailed'));
  }, [validate, mode, onUpdate, name, onClose, targetType, targetBusinessId, phone, onCreate, t]);

  const showDeviceContacts = mode === 'create' && deviceContactsSupported;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
            <Text style={styles.title}>
              {mode === 'create' ? t('debts.addClient') : t('debts.editClient')}
            </Text>

            {showDeviceContacts ? (
              <TouchableOpacity style={styles.deviceBtn} onPress={onOpenDeviceContacts} activeOpacity={0.8}>
                <Ionicons name="people-outline" size={18} color={colors.primary} />
                <Text style={styles.deviceBtnText}>{t('debts.fromPhoneContacts')}</Text>
              </TouchableOpacity>
            ) : null}

            <Input label={t('debts.fullName')} value={name} onChangeText={setName} placeholder="Ali Valiyev" />

            {mode === 'create' ? (
              <PartyTypeSelector
                value={targetType}
                onChange={setTargetType}
                profileLabel={t('debts.profileTarget')}
                businessLabel={t('debts.businessTarget')}
              />
            ) : null}

            {mode === 'create' && targetType === 'PROFILE' ? (
              <Input
                label={t('debts.phone')}
                value={phone}
                onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS))}
                keyboardType="phone-pad"
                placeholder={t('debts.phonePlaceholder')}
              />
            ) : null}

            {mode === 'create' && targetType === 'BUSINESS_ACCOUNT' ? (
              <Input
                label={t('debts.targetBusinessId')}
                value={targetBusinessId}
                onChangeText={setTargetBusinessId}
                placeholder="business-id"
              />
            ) : null}

            {localError ? <Text style={styles.error}>{localError}</Text> : null}

            <View style={styles.actions}>
              <Button title={t('common.cancel')} variant="secondary" onPress={onClose} style={styles.actionBtn} />
              <Button
                title={mode === 'create' ? t('common.add') : t('common.save')}
                onPress={handleSubmit}
                loading={submitting}
                style={styles.actionBtn}
              />
            </View>

            {mode === 'edit' ? <Text style={styles.hint}>{t('debts.updatingContact')}</Text> : null}

            {mode === 'edit' ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    (!canDelete || deleting) && styles.deleteBtnDisabled,
                    pressed && canDelete && !deleting && styles.deleteBtnPressed,
                  ]}
                  onPress={onDelete}
                  disabled={!canDelete || deleting}
                  accessibilityRole="button"
                  accessibilityLabel={t('debts.deleteContact')}
                  accessibilityState={{ disabled: !canDelete || deleting, busy: deleting }}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={styles.deleteBtnText}>{t('debts.deleteContact')}</Text>
                    </>
                  )}
                </Pressable>
                {!canDelete ? <Text style={styles.deleteHint}>{t('debts.deleteBlocked')}</Text> : null}
              </>
            ) : null}
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
    // Modal yuqoriroqda ochilsin — telefon klaviaturasi maydonlarni to'smasligi uchun.
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    card: {
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
    error: {
      ...typography.caption,
      color: colors.negative,
      marginBottom: spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
    hint: {
      ...typography.caption,
      marginTop: spacing.xs,
      color: colors.textSecondary,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xxs,
      minHeight: 40,
      marginTop: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.dangerMuted,
    },
    deleteBtnDisabled: {
      opacity: 0.45,
    },
    deleteBtnPressed: {
      opacity: 0.75,
    },
    deleteBtnText: {
      ...typography.button,
      fontSize: 13,
      color: colors.danger,
    },
    deleteHint: {
      ...typography.caption,
      marginTop: spacing.xxs,
      color: colors.textSecondary,
    },
  });

export default ContactFormModal;
