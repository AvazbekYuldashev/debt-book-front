import React, { useContext, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import AppTextInput from '../form/AppTextInput';
import PrimaryButton from '../ui/PrimaryButton';
import { AuthContext } from '../../context/AuthContext';
import { createBusiness } from '../../services/businessService';
import { BusinessDTO } from '../../types/business';
import { useI18n } from '../../i18n';

interface CreateBusinessModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (business: BusinessDTO) => void;
}

const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({ visible, onClose, onCreated }) => {
  const { t } = useI18n();
  const { profile } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (loading) return;
    setError('');
    setName('');
    setAddress('');
    onClose();
  };

  const handleSubmit = async () => {
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
      const created = await createBusiness(
        { name: name.trim(), address: address.trim() },
        profile.jwt
      );
      onCreated?.(created);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('business.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('business.createTitle')}</Text>
          <AppTextInput
            label={t('business.name')}
            value={name}
            onChangeText={setName}
            placeholder={t('business.namePlaceholder')}
            containerStyle={styles.field}
          />
          <AppTextInput
            label={t('business.address')}
            value={address}
            onChangeText={setAddress}
            placeholder={t('business.addressPlaceholder')}
            containerStyle={styles.field}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <PrimaryButton title={t('common.cancel')} variant="secondary" onPress={handleClose} style={styles.actionBtn} />
            <PrimaryButton title={t('business.createBtn')} onPress={handleSubmit} loading={loading} style={styles.actionBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  field: {
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
  },
  error: {
    color: '#DC2626',
    fontSize: 12,
    marginBottom: 8,
  },
});

export default CreateBusinessModal;
