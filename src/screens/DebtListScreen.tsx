import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
import AppTextInput from '../components/form/AppTextInput';
import PrimaryButton from '../components/ui/PrimaryButton';
import { SkeletonCardList } from '../components/ui/SkeletonShimmer';
import WorkspaceSwitcher from '../components/business/WorkspaceSwitcher';
import { ContactsContext } from '../context/ContactsContext';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { useAccountContext } from '../hooks/useAccountContext';
import { useAppTheme } from '../theme';
import { ColorTokens } from '../theme/colors';
import { ROUTES } from '../navigation/routes';
import { getMoneyHistory, getTotalPriceByPartyId } from '../services/moneyService';
import { extractMoneyTotals, formatMoney } from '../utils/money';
import { MoneyPriceDTO, MoneyResponseDTO, PartyType } from '../types/money';
import { canWrite, canDelete } from '../utils/permissions';
import { confirmDelete } from '../utils/confirm';
import { useI18n } from '../i18n';
import PartyTypeSelector from '../components/form/PartyTypeSelector';

type Mode = 'create' | 'edit';

const POSITIVE = '#0D9488';
const NEGATIVE = '#EF4444';

const DebtListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const { accountType } = useAccountContext();
  const {
    contacts,
    loading,
    creating,
    updating,
    deleting,
    error,
    refreshContacts,
    filterContacts,
    addContact,
    updateContact,
    deleteContact,
  } = useContext(ContactsContext);

  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<Mode>('create');
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [targetType, setTargetType] = useState<PartyType>('PROFILE');
  const [targetBusinessId, setTargetBusinessId] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [searchResults, setSearchResults] = useState<typeof contacts>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [totalsKey, setTotalsKey] = useState(0);
  const [totalsByContact, setTotalsByContact] = useState<
    Record<string, { totalDebt: number; totalCredit: number; balance: number }>
  >({});
  const [totalsLoading, setTotalsLoading] = useState(false);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedId),
    [contacts, selectedId]
  );

  const filteredContacts = useMemo(() => {
    const nameQuery = filterName.trim();
    const phoneQuery = filterPhone.replace(/\D/g, '');
    if (nameQuery.length < 3 && phoneQuery.length < 3) return contacts;
    return searchResults;
  }, [contacts, filterName, filterPhone, searchResults]);

  const aggregateTotals = useMemo(() => {
    let totalDebt = 0;
    let totalCredit = 0;
    for (const item of Object.values(totalsByContact)) {
      const balance = item.balance || 0;
      if (balance > 0) totalCredit += balance;
      if (balance < 0) totalDebt += Math.abs(balance);
    }
    return { totalDebt, totalCredit };
  }, [totalsByContact]);

  const handleRefresh = useCallback(async () => {
    await refreshContacts();
    setTotalsKey((prev) => prev + 1);
  }, [refreshContacts]);

  useFocusEffect(
    useCallback(() => {
      setTotalsKey((prev) => prev + 1);
    }, [])
  );

  const computeTotalsFromHistory = useCallback(
    (history: MoneyResponseDTO[], counterpartyId: string, counterpartyType: PartyType) => {
      let totalDebt = 0;
      let totalCredit = 0;
      const actorType: PartyType =
        workspace.mode === 'business' && workspace.activeBusinessId ? 'BUSINESS_ACCOUNT' : 'PROFILE';
      const actorId = actorType === 'BUSINESS_ACCOUNT' ? workspace.activeBusinessId || '' : profile?.id || '';

      for (const item of history) {
        let isCreditor = false;
        let isDebtor = false;

        if (actorType === 'BUSINESS_ACCOUNT') {
          isCreditor = (item.creditorType === 'BUSINESS_ACCOUNT' || !!item.creditorBusinessId)
            && item.creditorBusinessId === actorId;
          isDebtor = (item.debtorType === 'BUSINESS_ACCOUNT' || !!item.debtorBusinessId)
            && item.debtorBusinessId === actorId;
        } else {
          isCreditor = (!item.creditorType || item.creditorType === 'PROFILE') && item.creditorId === actorId;
          isDebtor = (!item.debtorType || item.debtorType === 'PROFILE') && item.debtorId === actorId;
        }

        if (!isCreditor && !isDebtor && counterpartyId) {
          if (counterpartyType === 'BUSINESS_ACCOUNT') {
            if (item.debtorBusinessId === counterpartyId) isCreditor = true;
            if (item.creditorBusinessId === counterpartyId) isDebtor = true;
          } else {
            if (item.debtorId === counterpartyId) isCreditor = true;
            if (item.creditorId === counterpartyId) isDebtor = true;
          }
        }

        if (isCreditor) totalCredit += item.amount;
        if (isDebtor) totalDebt += item.amount;
      }

      return { totalDebt, totalCredit, balance: totalCredit - totalDebt };
    },
    [profile?.id, workspace.activeBusinessId, workspace.mode]
  );

  useEffect(() => {
    let cancelled = false;

    const loadTotals = async () => {
      if (!profile?.jwt || contacts.length === 0) {
        setTotalsByContact({});
        return;
      }

      setTotalsLoading(true);
      const next: Record<string, { totalDebt: number; totalCredit: number; balance: number }> = {};
      const queue = [...contacts];
      const workerCount = Math.min(5, queue.length);

      const runWorker = async () => {
        while (queue.length && !cancelled) {
          const contact = queue.shift();
          if (!contact) return;
          try {
            const counterpartyId = contact.partyId?.trim() || '';
            const counterpartyType = contact.partyType;
            if (!counterpartyId) continue;

            const price = (await getTotalPriceByPartyId(counterpartyId, counterpartyType, profile.jwt, accountType)) as MoneyPriceDTO;
            let totals = extractMoneyTotals(price ?? null);

            if (totals.totalDebt === 0 && totals.totalCredit === 0) {
              const all: MoneyResponseDTO[] = [];
              let page = 0;
              let safety = 0;
              while (safety < 20) {
                const historyPage = await getMoneyHistory({
                  id: counterpartyId,
                  partyType: counterpartyType,
                  page,
                  size: 100,
                  token: profile.jwt,
                  accountType,
                });
                all.push(...(historyPage.content ?? []));
                if (historyPage.last || page >= historyPage.totalPages - 1) break;
                page += 1;
                safety += 1;
              }
              totals = computeTotalsFromHistory(all, counterpartyId, counterpartyType);
            }

            if (totals.totalDebt === 0 && totals.totalCredit === 0 && contact.id) {
              const all: MoneyResponseDTO[] = [];
              let page = 0;
              let safety = 0;
              while (safety < 20) {
                const historyPage = await getMoneyHistory({
                  id: contact.id,
                  partyType: 'PROFILE',
                  page,
                  size: 100,
                  token: profile.jwt,
                  accountType,
                });
                all.push(...(historyPage.content ?? []));
                if (historyPage.last || page >= historyPage.totalPages - 1) break;
                page += 1;
                safety += 1;
              }
              totals = computeTotalsFromHistory(all, contact.id, 'PROFILE');
            }

            next[contact.id] = totals;
          } catch {
            // ignore per-contact failure
          }
        }
      };

      try {
        await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
        if (!cancelled) setTotalsByContact(next);
      } finally {
        if (!cancelled) setTotalsLoading(false);
      }
    };

    loadTotals();
    return () => {
      cancelled = true;
    };
  }, [accountType, computeTotalsFromHistory, contacts, profile?.jwt, totalsKey]);

  useEffect(() => {
    const nameQuery = filterName.trim();
    const phoneQuery = filterPhone.replace(/\D/g, '');
    if (nameQuery.length < 3 && phoneQuery.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const result = await filterContacts({ name: nameQuery, phoneNumber: phoneQuery });
        if (!cancelled) {
          setSearchResults(result);
          setLocalError('');
        }
      } catch (e) {
        if (!cancelled) {
          setSearchResults([]);
          setLocalError(e instanceof Error ? e.message : t('debts.searchError'));
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filterContacts, filterName, filterPhone]);

  const openCreate = () => {
    setMode('create');
    setSelectedId('');
    setName('');
    setPhone('');
    setTargetType('PROFILE');
    setTargetBusinessId('');
    setLocalError('');
    setModalVisible(true);
  };

  const openEdit = (id: string) => {
    const target = contacts.find((contact) => contact.id === id);
    if (!target) return;
    setMode('edit');
    setSelectedId(id);
    setName(target.fullName);
    setPhone('');
    setLocalError('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setLocalError('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setLocalError(t('debts.enterName'));
      return;
    }

    if (mode === 'create') {
      if (targetType === 'BUSINESS_ACCOUNT') {
        if (!targetBusinessId.trim()) {
          setLocalError(t('debts.businessIdRequired'));
          return;
        }

        const ok = await addContact({
          name: name.trim(),
          targetType,
          targetBusinessId: targetBusinessId.trim(),
        });

        if (ok) closeModal();
        return;
      }

      if (!phone.trim()) {
        setLocalError(t('debts.enterPhone'));
        return;
      }
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 9 && digits.length !== 12) {
        setLocalError(t('debts.phoneLength'));
        return;
      }

      if (digits.length === 12 && !digits.startsWith('998')) {
        setLocalError(t('debts.phone998'));
        return;
      }

      const ok = await addContact({
        name: name.trim(),
        targetType,
        phone: digits,
      });

      if (ok) closeModal();
      else setLocalError(t('debts.saveFailed'));
      return;
    }

    const ok = await updateContact(selectedId, { name: name.trim() });

    if (ok) closeModal();
  };

  const handleDelete = (id: string) => {
    const target = contacts.find((c) => c.id === id);
    confirmDelete(target?.fullName || t('debts.thisContact'), async () => {
      await deleteContact(id);
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <WorkspaceSwitcher />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('debts.clientsTitle')}</Text>
          {canWrite(workspace.activeBusinessRole) ? (
            <TouchableOpacity style={styles.headerAction} onPress={openCreate}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.headerActionText}>{t('common.add')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <AppTextInput
          label={t('debts.filterName')}
          value={filterName}
          onChangeText={setFilterName}
          placeholder={t('debts.min3letters')}
          containerStyle={styles.searchInput}
        />
        <AppTextInput
          label={t('debts.filterPhone')}
          value={filterPhone}
          onChangeText={(value) => setFilterPhone(value.replace(/\D/g, '').slice(0, 12))}
          keyboardType="phone-pad"
          placeholder={t('debts.min3digits')}
          containerStyle={styles.searchInput}
        />

        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{t('debts.currentDebt')}</Text>
            <Text style={[styles.summaryValue, { color: NEGATIVE }]}>{formatMoney(aggregateTotals.totalDebt)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{t('debts.currentCredit')}</Text>
            <Text style={[styles.summaryValue, { color: POSITIVE }]}>{formatMoney(aggregateTotals.totalCredit)}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.listCard}>
          {loading || searchLoading ? (
            <SkeletonCardList count={5} containerStyle={styles.listSkeleton} />
          ) : filteredContacts.length === 0 ? (
            <Text style={styles.emptyText}>{t('debts.emptyAccount')}</Text>
          ) : (
            filteredContacts.map((item, index) => {
              const balance = totalsByContact[item.id]?.balance;
              const balanceColor = balance && balance > 0 ? POSITIVE : balance && balance < 0 ? NEGATIVE : colors.textSecondary;
              return (
                <View
                  key={item.id || `contact-${index}`}
                  style={[styles.row, index !== filteredContacts.length - 1 && styles.rowBorder]}
                >
                  <TouchableOpacity
                    style={styles.rowMain}
                    onPress={() => navigation.navigate(ROUTES.CONTACT_DETAIL, { id: item.id })}
                  >
                    <Text style={styles.name}>{item.fullName}</Text>
                    <Text style={styles.phone}>
                      {item.partyType === 'BUSINESS_ACCOUNT'
                        ? `${t('debts.businessLabel')}: ${item.partyId || '--'}`
                        : item.phone || item.partyId || '--'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.rowRight}>
                    <Text style={[styles.balanceText, { color: balanceColor }]}>
                      {typeof balance === 'number' ? formatMoney(balance) : totalsLoading ? '...' : '--'}
                    </Text>
                    <View style={styles.actions}>
                      {canWrite(workspace.activeBusinessRole) ? (
                        <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item.id)}>
                          <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      ) : null}
                      {canDelete(workspace.activeBusinessRole) ? (
                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item.id)} disabled={deleting}>
                          <Ionicons name="trash-outline" size={16} color={NEGATIVE} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {mode === 'create' ? t('debts.addClient') : t('debts.editClient')}
            </Text>
            <AppTextInput label={t('debts.fullName')} value={name} onChangeText={setName} placeholder="Ali Valiyev" />
            {mode === 'create' ? (
              <PartyTypeSelector
                value={targetType}
                onChange={setTargetType}
                profileLabel={t('debts.profileTarget')}
                businessLabel={t('debts.businessTarget')}
              />
            ) : null}
            {mode === 'create' && targetType === 'PROFILE' ? (
              <AppTextInput
                label={t('debts.phone')}
                value={phone}
                onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 12))}
                keyboardType="phone-pad"
                placeholder={t('debts.phonePlaceholder')}
              />
            ) : null}
            {mode === 'create' && targetType === 'BUSINESS_ACCOUNT' ? (
              <AppTextInput
                label={t('debts.targetBusinessId')}
                value={targetBusinessId}
                onChangeText={setTargetBusinessId}
                placeholder="business-id"
              />
            ) : null}
            {localError ? <Text style={styles.localError}>{localError}</Text> : null}
            <View style={styles.modalActions}>
              <PrimaryButton
                title={t('common.cancel')}
                variant="secondary"
                onPress={closeModal}
                style={styles.modalActionBtn}
              />
              <PrimaryButton
                title={mode === 'create' ? t('common.add') : t('common.save')}
                onPress={handleSave}
                loading={creating || updating}
                style={styles.modalActionBtn}
              />
            </View>
            {mode === 'edit' && selectedContact ? (
              <Text style={styles.editHint}>{t('debts.updatingContact')}</Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  searchInput: {
    marginBottom: 14,
  },
  summaryCard: {
    flexDirection: 'row',
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
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  errorRow: {
    padding: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: NEGATIVE,
    fontSize: 13,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMain: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  phone: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  localError: {
    color: NEGATIVE,
    marginBottom: 10,
    fontSize: 12,
  },
  targetTypeWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  targetChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 8,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  targetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  targetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  targetChipTextActive: {
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalActionBtn: {
    flex: 1,
  },
  editHint: {
    marginTop: 10,
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default DebtListScreen;
