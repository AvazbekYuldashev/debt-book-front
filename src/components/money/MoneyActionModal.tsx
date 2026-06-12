import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppTextInput from '../form/AppTextInput';
import PrimaryButton from '../ui/PrimaryButton';
import { AccountType, ACCOUNT_TYPE, MoneyActionType, MoneyFlowType, MONEY_FLOW_TYPE, PartyType } from '../../types/money';
import colors from '../../styles/colors';
import { getSelectableBusinessMembers } from '../../services/businessService';
import { BusinessProfileDTO } from '../../types/business';
import { useI18n } from '../../i18n';

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
  ownerAccountType: AccountType;
  token?: string;
  onClose: () => void;
  onSubmit: (payload: {
    amount: number;
    targetPartyType: PartyType;
    targetPartyId?: string;
    description: string;
    fromAccountType: AccountType;
    toAccountType: AccountType;
    moneyFlowType: MoneyFlowType;
    targetBusinessProfileId?: string;
  }) => Promise<void>;
}

const MoneyActionModal: React.FC<MoneyActionModalProps> = ({
  visible,
  actionType,
  loading = false,
  contacts = [],
  fixedCounterpartyId,
  fixedCounterpartyType,
  ownerAccountType,
  token,
  onClose,
  onSubmit,
}) => {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [targetType, setTargetType] = useState<PartyType>('PROFILE');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [members, setMembers] = useState<BusinessProfileDTO[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);

  const effectiveType = fixedCounterpartyType || targetType;
  const businessIdForMembers =
    effectiveType === 'BUSINESS_ACCOUNT' ? (fixedCounterpartyId || counterpartyId).trim() : '';

  // Counterparty business bo'lsa, o'sha biznes a'zolarini yuklab tanlash imkonini beramiz.
  useEffect(() => {
    let cancelled = false;
    if (!visible || !businessIdForMembers) {
      setMembers([]);
      setSelectedMemberId('');
      return;
    }
    setMembersLoading(true);
    getSelectableBusinessMembers(businessIdForMembers, token)
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, businessIdForMembers, token]);

  const labels = useMemo(
    () =>
      actionType === 'GIVE'
        ? {
            title: t('money.give'),
            idLabel: t('money.giveReceiverId'),
            save: t('money.give'),
          }
        : {
            title: t('money.take'),
            idLabel: t('money.takeGiverId'),
            save: t('money.take'),
          },
    [actionType, t]
  );

  const targetAccountType = (fixedCounterpartyType || targetType) === 'BUSINESS_ACCOUNT'
    ? ACCOUNT_TYPE.BUSINESS
    : ACCOUNT_TYPE.PERSONAL;

  const resetState = () => {
    setAmount('');
    setCounterpartyId('');
    setTargetType('PROFILE');
    setDescription('');
    setError('');
    setSelectedMemberId('');
    setMembers([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    const parsedAmount = Number(amount.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('money.amountInvalid'));
      return;
    }
    const targetCounterpartyId = fixedCounterpartyId || counterpartyId.trim();
    if (!targetCounterpartyId) {
      setError((fixedCounterpartyType || targetType) === 'BUSINESS_ACCOUNT' ? t('money.targetBusinessRequired') : t('money.counterpartyRequired'));
      return;
    }

    // Counterparty business bo'lsa — pul kimga (qaysi xodimga) berilgani MAJBURIY.
    if (effectiveType === 'BUSINESS_ACCOUNT' && !selectedMemberId) {
      setError(t('money.selectMember'));
      return;
    }

    setError('');
    await onSubmit({
      amount: parsedAmount,
      targetPartyType: fixedCounterpartyType || targetType,
      targetPartyId: targetCounterpartyId,
      targetBusinessProfileId: selectedMemberId || undefined,
      description: description.trim(),
      fromAccountType: actionType === 'GIVE' ? ownerAccountType : targetAccountType,
      toAccountType: actionType === 'GIVE' ? targetAccountType : ownerAccountType,
      moneyFlowType:
        actionType === 'GIVE'
          ? ownerAccountType === ACCOUNT_TYPE.BUSINESS && targetAccountType === ACCOUNT_TYPE.PERSONAL
            ? MONEY_FLOW_TYPE.BUSINESS_TO_PERSONAL
            : ownerAccountType === ACCOUNT_TYPE.PERSONAL && targetAccountType === ACCOUNT_TYPE.BUSINESS
              ? MONEY_FLOW_TYPE.PERSONAL_TO_BUSINESS
              : ownerAccountType === ACCOUNT_TYPE.BUSINESS
                ? MONEY_FLOW_TYPE.BUSINESS_TO_BUSINESS
                : MONEY_FLOW_TYPE.PERSONAL_TO_PERSONAL
          : targetAccountType === ACCOUNT_TYPE.BUSINESS && ownerAccountType === ACCOUNT_TYPE.PERSONAL
            ? MONEY_FLOW_TYPE.BUSINESS_TO_PERSONAL
            : targetAccountType === ACCOUNT_TYPE.PERSONAL && ownerAccountType === ACCOUNT_TYPE.BUSINESS
              ? MONEY_FLOW_TYPE.PERSONAL_TO_BUSINESS
              : targetAccountType === ACCOUNT_TYPE.BUSINESS
                ? MONEY_FLOW_TYPE.BUSINESS_TO_BUSINESS
                : MONEY_FLOW_TYPE.PERSONAL_TO_PERSONAL,
    });
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>{labels.title}</Text>
          <AppTextInput
            label={t('money.amount')}
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
                  {t('money.profile')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.targetChip, targetType === 'BUSINESS_ACCOUNT' && styles.targetChipActive]}
                onPress={() => setTargetType('BUSINESS_ACCOUNT')}
              >
                <Text
                  style={[styles.targetChipText, targetType === 'BUSINESS_ACCOUNT' && styles.targetChipTextActive]}
                >
                  {t('money.business')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {!fixedCounterpartyId ? (
            <AppTextInput
              label={targetType === 'BUSINESS_ACCOUNT' ? t('money.targetBusinessId') : labels.idLabel}
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
          {effectiveType === 'BUSINESS_ACCOUNT' && businessIdForMembers ? (
            <View style={styles.memberWrap}>
              <Text style={styles.memberLabel}>{t('money.memberLabel')}</Text>
              {membersLoading ? (
                <Text style={styles.memberHint}>{t('common.loading')}</Text>
              ) : members.length === 0 ? (
                <Text style={styles.memberHint}>{t('money.membersEmpty')}</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contactRow}>
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.profileId}
                      style={[styles.contactChip, selectedMemberId === m.profileId ? styles.contactChipActive : null]}
                      onPress={() =>
                        setSelectedMemberId((prev) => (prev === m.profileId ? '' : m.profileId))
                      }
                    >
                      <Text style={styles.contactChipText}>
                        {m.profileName || m.profileUsername || m.phoneNumber || '--'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
          <AppTextInput
            label={t('money.comment')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('money.commentPlaceholder')}
            multiline
            numberOfLines={3}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <PrimaryButton title={t('common.cancel')} variant="secondary" onPress={handleClose} style={styles.actionBtn} />
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
  memberWrap: {
    marginBottom: 8,
  },
  memberLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  memberHint: {
    fontSize: 12,
    color: colors.textSecondary,
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
