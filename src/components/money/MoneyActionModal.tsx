import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppTextInput from '../form/AppTextInput';
import PrimaryButton from '../ui/PrimaryButton';
import { MoneyActionType, PartyType } from '../../types/money';
import colors from '../../styles/colors';

interface ContactOption {
  id: string;
  label: string;
}

interface MoneyActionModalProps {
  visible: boolean;
  actionType: MoneyActionType;
  loading?: boolean;
  contacts?: ContactOption[];
  fixedCounterpartyId?: string;
  fixedCounterpartyType?: PartyType;
  onClose: () => void;
  onSubmit: (payload: { amount: number; targetPartyType: PartyType; targetPartyId?: string; description: string }) => Promise<void>;
}

const MoneyActionModal: React.FC<MoneyActionModalProps> = ({
  visible,
  actionType,
  loading = false,
  contacts = [],
  fixedCounterpartyId,
  fixedCounterpartyType,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [targetType, setTargetType] = useState<PartyType>('PROFILE');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const labels = useMemo(
    () =>
      actionType === 'GIVE'
        ? {
            title: 'Qarz berish',
            idLabel: 'Qarz oluvchi ID',
            save: 'Qarz berish',
          }
        : {
            title: 'Qarz olish',
            idLabel: 'Qarz beruvchi ID',
            save: 'Qarz olish',
          },
    [actionType]
  );

  const resetState = () => {
    setAmount('');
    setCounterpartyId('');
    setTargetType('PROFILE');
    setDescription('');
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    const parsedAmount = Number(amount.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Miqdor to'g'ri kiritilmagan");
      return;
    }
    const targetCounterpartyId = fixedCounterpartyId || counterpartyId.trim();
    if (!targetCounterpartyId) {
      setError((fixedCounterpartyType || targetType) === 'BUSINESS_ACCOUNT' ? 'Target business ID majburiy' : 'Counterparty ID majburiy');
      return;
    }

    setError('');
    await onSubmit({
      amount: parsedAmount,
      targetPartyType: fixedCounterpartyType || targetType,
      targetPartyId: targetCounterpartyId,
      description: description.trim(),
    });
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>{labels.title}</Text>
          <AppTextInput
            label="Miqdor"
            value={amount}
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="100000"
          />
          {!fixedCounterpartyId ? (
            <View style={styles.targetTypeWrap}>
              <TouchableOpacity
                style={[styles.targetChip, targetType === 'PROFILE' && styles.targetChipActive]}
                onPress={() => setTargetType('PROFILE')}
              >
                <Text style={[styles.targetChipText, targetType === 'PROFILE' && styles.targetChipTextActive]}>
                  Profile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.targetChip, targetType === 'BUSINESS_ACCOUNT' && styles.targetChipActive]}
                onPress={() => setTargetType('BUSINESS_ACCOUNT')}
              >
                <Text
                  style={[styles.targetChipText, targetType === 'BUSINESS_ACCOUNT' && styles.targetChipTextActive]}
                >
                  Business
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {!fixedCounterpartyId ? (
            <AppTextInput
              label={targetType === 'BUSINESS_ACCOUNT' ? 'Target business ID' : labels.idLabel}
              value={counterpartyId}
              onChangeText={setCounterpartyId}
              placeholder={targetType === 'BUSINESS_ACCOUNT' ? 'business-id' : 'profile-id'}
            />
          ) : null}
          {!fixedCounterpartyId && contacts.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contactRow}>
              {contacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  style={[
                    styles.contactChip,
                    counterpartyId === contact.id ? styles.contactChipActive : null,
                  ]}
                  onPress={() => setCounterpartyId(contact.id)}
                >
                  <Text style={styles.contactChipText}>{contact.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
          <AppTextInput
            label="Izoh"
            value={description}
            onChangeText={setDescription}
            placeholder="Ixtiyoriy izoh"
            multiline
            numberOfLines={3}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <PrimaryButton title="Bekor qilish" variant="secondary" onPress={handleClose} style={styles.actionBtn} />
            <PrimaryButton title={labels.save} onPress={handleSubmit} loading={loading} style={styles.actionBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 16,
  },
  modal: {
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  contactRow: {
    gap: 8,
    paddingBottom: 8,
  },
  contactChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  contactChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#eef5ff',
  },
  contactChipText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  error: {
    marginTop: 6,
    marginBottom: 8,
    color: colors.danger,
    fontSize: 12,
  },
  targetTypeWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  targetChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  targetChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#eef5ff',
  },
  targetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  targetChipTextActive: {
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
  },
});

export default MoneyActionModal;
