import React, { useContext, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import AppTextInput from '../form/AppTextInput';
import PrimaryButton from '../ui/PrimaryButton';
import { AuthContext } from '../../context/AuthContext';
import { createBusiness } from '../../services/businessService';
import { BusinessDTO } from '../../types/business';

interface CreateBusinessModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (business: BusinessDTO) => void;
}

const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({ visible, onClose, onCreated }) => {
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
      setError('Token topilmadi. Qayta login qiling.');
      return;
    }
    if (!name.trim()) {
      setError('Business nomini kiriting.');
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
      setError(e instanceof Error ? e.message : 'Business yaratib bo‘lmadi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Business</Text>
          <AppTextInput
            label="Business name"
            value={name}
            onChangeText={setName}
            placeholder="My Shop"
            containerStyle={styles.field}
          />
          <AppTextInput
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Tashkent, Chilonzor"
            containerStyle={styles.field}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <PrimaryButton title="Cancel" variant="secondary" onPress={handleClose} style={styles.actionBtn} />
            <PrimaryButton title="Create" onPress={handleSubmit} loading={loading} style={styles.actionBtn} />
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
