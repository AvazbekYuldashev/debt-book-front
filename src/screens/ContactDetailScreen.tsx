import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MoneyActionModal from '../components/money/MoneyActionModal';
import PrimaryButton from '../components/ui/PrimaryButton';
import { SkeletonCardList } from '../components/ui/SkeletonShimmer';
import { AuthContext } from '../context/AuthContext';
import { ContactsContext } from '../context/ContactsContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { useMoney } from '../hooks/useMoney';
import { AccountType, MoneyActionType, MoneyFlowType, MoneyResponseDTO, PartyType } from '../types/money';
import { formatMoney } from '../utils/money';
import { formatPhoneDisplay } from '../utils/phone';
import { useAccountContext } from '../hooks/useAccountContext';
import { canWrite } from '../utils/permissions';
import { useI18n, translate } from '../i18n';
import { useAppTheme } from '../theme';
import { ColorTokens } from '../theme/colors';

const POSITIVE = '#0D9488';
const NEGATIVE = '#EF4444';

const ContactDetailScreen: React.FC<any> = ({ route, navigation }) => {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const contactId = route.params?.id || '';
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const { accountType } = useAccountContext();
  const { contacts } = useContext(ContactsContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<MoneyActionType>('TAKE');
  const [selectedTransaction, setSelectedTransaction] = useState<ReturnType<typeof mapTransaction> | null>(null);

  const { history, totals, selectedCounterparty, loading, creating, error, fetchData, createMoney } = useMoney({
    token: profile?.jwt,
  });

  const contact = useMemo(
    () => contacts.find((item) => item.id === contactId),
    [contacts, contactId]
  );

  const netBalance = useMemo(
    () => totals.totalCredit - totals.totalDebt,
    [totals.totalCredit, totals.totalDebt]
  );

  // Biznes kontekstida MEMBER (USER) faqat ko'rishi mumkin -> yozish tugmalari yashiriladi.
  const allowWrite = canWrite(workspace.activeBusinessRole);

  // Biznes ishtirok etgan tranzaksiyada: biznesdagi qaysi xodim (personal account) qilgan.
  const performerPhone = useMemo(() => {
    if (!selectedTransaction) return '';
    const businessInvolved = Boolean(
      selectedTransaction.creditorBusinessId || selectedTransaction.debtorBusinessId
    );
    if (!businessInvolved) return '';
    return (
      selectedTransaction.creditorBusinessProfilePhone ||
      selectedTransaction.debtorBusinessProfilePhone ||
      selectedTransaction.createdByProfilePhone ||
      ''
    );
  }, [selectedTransaction]);

  const mappedHistory = useMemo(
    () =>
      history.map((item) =>
        mapTransaction(item, {
          partyType: workspace.mode === 'business' && workspace.activeBusinessId ? 'BUSINESS_ACCOUNT' : 'PROFILE',
          partyId: workspace.mode === 'business' ? workspace.activeBusinessId || '' : profile?.id || '',
        }, selectedCounterparty || undefined)
      ),
    [history, profile?.id, selectedCounterparty, workspace.activeBusinessId, workspace.mode]
  );

  const loadScreenData = useCallback(async () => {
    if (!contact?.partyType) return;
    await fetchData({
      partyType: contact.partyType,
      partyId: contact.partyId,
      phoneFallback: contact.partyType === 'PROFILE' ? contact.phone : undefined,
    });
  }, [contact?.partyId, contact?.partyType, contact?.phone, fetchData, workspace.activeBusinessId, workspace.mode]);

  useFocusEffect(
    useCallback(() => {
      loadScreenData();
    }, [loadScreenData])
  );

  const openModal = (type: MoneyActionType) => {
    setActionType(type);
    setModalVisible(true);
  };

  const handleCreate = async (payload: {
    amount: number;
    targetPartyType: PartyType;
    targetPartyId?: string;
    description: string;
    fromAccountType: AccountType;
    toAccountType: AccountType;
    moneyFlowType: MoneyFlowType;
    targetBusinessProfileId?: string;
  }) => {
    if (!contact) return;
    const ok = await createMoney(actionType, {
      ...payload,
      targetPartyType: contact.partyType,
      targetPartyId: contact.partyId,
      targetPhone: contact.partyType === 'PROFILE' ? contact.phone : undefined,
    });
    if (ok) setModalVisible(false);
  };

  if (!contact) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('contact.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadScreenData} tintColor={colors.primary} />}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.contactName}>{contact.fullName}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
          <Text style={styles.balanceLabel}>{t('contact.currentBalance')}</Text>
          <Text style={[styles.balanceValue, netBalance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
            {formatMoney(netBalance)}
          </Text>
        </View>

        {error ? (
          <TouchableOpacity style={styles.errorBox} onPress={loadScreenData}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.listCard}>
          {loading && mappedHistory.length === 0 ? (
            <SkeletonCardList count={4} containerStyle={styles.listSkeleton} />
          ) : mappedHistory.length === 0 ? (
            <Text style={styles.emptyText}>{t('debts.emptyAccount')}</Text>
          ) : (
            mappedHistory.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => setSelectedTransaction(item)}
                style={[styles.txRow, index !== mappedHistory.length - 1 && styles.txBorder]}
              >
                <View style={styles.txLeft}>
                  <View style={[styles.txIconWrap, item.kind === 'credit' ? styles.txIconCredit : styles.txIconDebt]}>
                    <Ionicons
                      name={item.kind === 'credit' ? 'arrow-up-outline' : 'arrow-down-outline'}
                      size={14}
                      color={item.kind === 'credit' ? POSITIVE : NEGATIVE}
                    />
                  </View>
                  <Text style={styles.txDate}>{formatDateShort(item.createdDate)}</Text>
                </View>
                <Text style={styles.txLabel}>{item.label}</Text>
                <Text style={[styles.txAmount, item.kind === 'credit' ? styles.txAmountPositive : styles.txAmountNegative]}>
                  {formatMoney(item.amount)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {allowWrite ? (
          <View style={styles.bottomActions}>
            <PrimaryButton
              title={t('contact.took')}
              variant="primary"
              onPress={() => openModal('TAKE')}
              style={[styles.actionBtn, styles.takeActionBtn]}
            />
            <PrimaryButton
              title={t('contact.gave')}
              onPress={() => openModal('GIVE')}
              style={[styles.actionBtn, styles.giveActionBtn]}
            />
          </View>
        ) : (
          <Text style={styles.readOnlyNote}>{t('contact.readOnly')}</Text>
        )}
      </ScrollView>

      <MoneyActionModal
        visible={modalVisible}
        actionType={actionType}
        loading={creating}
        fixedCounterpartyId={contact.partyId}
        fixedCounterpartyType={contact.partyType}
        ownerAccountType={accountType}
        token={profile?.jwt}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreate}
      />

      <Modal
        visible={Boolean(selectedTransaction)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTransaction(null)}
      >
        <View style={styles.detailBackdrop}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{t('contact.txDetail')}</Text>
              <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setSelectedTransaction(null)}>
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('contact.type')}</Text>
              <Text
                style={[
                  styles.detailValue,
                  selectedTransaction?.kind === 'credit' ? styles.txAmountPositive : styles.txAmountNegative,
                ]}
              >
                {selectedTransaction?.kind === 'credit' ? t('contact.creditGiven') : t('contact.debtTaken')}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('contact.amount')}</Text>
              <Text
                style={[
                  styles.detailValue,
                  selectedTransaction?.kind === 'credit' ? styles.txAmountPositive : styles.txAmountNegative,
                ]}
              >
                {selectedTransaction ? formatMoney(selectedTransaction.amount) : '--'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('contact.date')}</Text>
              <Text style={styles.detailValueMuted}>
                {selectedTransaction ? formatDateLong(selectedTransaction.createdDate) : '--'}
              </Text>
            </View>

            {performerPhone ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('contact.employee')}</Text>
                <Text style={styles.detailValueMuted}>{formatPhoneDisplay(performerPhone)}</Text>
              </View>
            ) : null}

            <View style={styles.detailDescriptionBox}>
              <Text style={styles.detailLabel}>{t('contact.comment')}</Text>
              <Text style={styles.detailDescription}>
                {selectedTransaction?.description?.trim() || t('contact.noComment')}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

function mapTransaction(
  item: MoneyResponseDTO,
  owner: { partyType: PartyType; partyId: string },
  counterparty?: { id: string; partyType: PartyType }
) {
  let isCredit = false;
  let isDebt = false;

  if (owner.partyType === 'BUSINESS_ACCOUNT') {
    isCredit = (item.creditorType === 'BUSINESS_ACCOUNT' || !!item.creditorBusinessId) && item.creditorBusinessId === owner.partyId;
    isDebt = (item.debtorType === 'BUSINESS_ACCOUNT' || !!item.debtorBusinessId) && item.debtorBusinessId === owner.partyId;
  } else {
    isCredit = (!item.creditorType || item.creditorType === 'PROFILE') && item.creditorId === owner.partyId;
    isDebt = (!item.debtorType || item.debtorType === 'PROFILE') && item.debtorId === owner.partyId;
  }

  if (!isCredit && !isDebt && counterparty?.id) {
    if (counterparty.partyType === 'BUSINESS_ACCOUNT') {
      if (item.debtorBusinessId === counterparty.id) isCredit = true;
      if (item.creditorBusinessId === counterparty.id) isDebt = true;
    } else {
      if (item.debtorId === counterparty.id) isCredit = true;
      if (item.creditorId === counterparty.id) isDebt = true;
    }
  }

  return {
    ...item,
    kind: isCredit ? 'credit' as const : 'debt' as const,
    label: isCredit ? translate('contact.creditGiven') : translate('contact.debtTaken'),
  };
}

function formatDateShort(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDateLong(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  topBar: {
    marginBottom: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  contactName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contactPhone: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  balanceLabel: {
    marginTop: 14,
    fontSize: 12,
    color: colors.textSecondary,
  },
  balanceValue: {
    marginTop: 4,
    fontSize: 34,
    fontWeight: '700',
  },
  balancePositive: {
    color: POSITIVE,
  },
  balanceNegative: {
    color: NEGATIVE,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: NEGATIVE,
    fontSize: 13,
  },
  retryText: {
    color: colors.primary,
    marginTop: 4,
    fontWeight: '600',
    fontSize: 12,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listSkeleton: {
    padding: 12,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  txBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txLeft: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconCredit: {
    backgroundColor: colors.primarySoft,
  },
  txIconDebt: {
    backgroundColor: colors.dangerMuted,
  },
  txDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  txLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txAmountPositive: {
    color: POSITIVE,
  },
  txAmountNegative: {
    color: NEGATIVE,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
  },
  takeActionBtn: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    borderWidth: 0,
  },
  giveActionBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderWidth: 0,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: 22,
  },
  readOnlyNote: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 16,
    paddingVertical: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  detailBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 16,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailValueMuted: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  detailDescriptionBox: {
    marginTop: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  detailDescription: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});

export default ContactDetailScreen;
