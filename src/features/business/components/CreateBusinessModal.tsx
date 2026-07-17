import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { AuthContext } from '../../auth/context/AuthContext';
import { createBusiness } from '../services/businessService';
import { BusinessDTO } from '../types/business';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';

interface CreateBusinessModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (business: BusinessDTO) => void;
}

/** Yangi biznes yaratish modali: forma holati va xatolik shu yerda inkapsulyatsiya qilingan. */
const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({ visible, onClose, onCreated }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Har ochilishda toza forma — oldingi urinish qoldiqlari ko'rinmaydi.
  useEffect(() => {
    if (!visible) return;
    setName('');
    setAddress('');
    setError('');
  }, [visible]);

  const handleClose = useCallback(() => {
    if (loading) return;
    onClose();
  }, [loading, onClose]);

  const handleNameChange = useCallback((value: string) => {
    setError('');
    setName(value);
  }, []);
  const handleAddressChange = useCallback((value: string) => {
    setError('');
    setAddress(value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!profile?.jwt) {
      setError(t('business.noToken'));
      return;
    }
    if (!name.trim()) {
      setError(t('business.enterName'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const created = await createBusiness({ name: name.trim(), address: address.trim() }, profile.jwt);
      onCreated?.(created);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('business.createFailed'));
    } finally {
      setLoading(false);
    }
  }, [profile?.jwt, name, address, onCreated, onClose, t]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {t('business.createTitle')}
          </Text>
          <Input
            label={t('business.name')}
            value={name}
            onChangeText={handleNameChange}
            placeholder={t('business.namePlaceholder')}
          />
          <Input
            label={t('business.address')}
            value={address}
            onChangeText={handleAddressChange}
            placeholder={t('business.addressPlaceholder')}
          />
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button title={t('common.cancel')} variant="secondary" onPress={handleClose} style={styles.actionBtn} />
            <Button title={t('business.createBtn')} onPress={handleSubmit} loading={loading} style={styles.actionBtn} />
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
      justifyContent: 'center',
      padding: spacing.md,
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

export default CreateBusinessModal;
