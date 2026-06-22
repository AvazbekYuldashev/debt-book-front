import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { computeTotalsFromHistory as computeTotals } from '../application/usecases/computeContactBalance';
import { getInitials, pickAvatarColor } from '../shared/ui/avatar';
import { extractMoneyTotals, formatMoney } from '../utils/money';
import { MoneyPriceDTO, MoneyResponseDTO, PartyType } from '../types/money';
import { canWrite, canDelete } from '../utils/permissions';
import { confirmDelete } from '../utils/confirm';
import { getPhoneValidationError } from '../utils/phone';
import { useI18n } from '../i18n';
import PartyTypeSelector from '../components/form/PartyTypeSelector';

type Mode = 'create' | 'edit';

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
  const [activeSearch, setActiveSearch] = useState<'name' | 'phone' | null>(null);
  const [searchResults, setSearchResults] = useState<typeof contacts>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [totalsKey, setTotalsKey] = useState(0);
  const [totalsByContact, setTotalsByContact] = useState<
    Record<string, { totalDebt: number; totalCredit: number; balance: number }>
  >({});
  // Har bir kontaktning eng oxirgi amal (oldi-berdi) vaqti — ro'yxatni saralash uchun.
  const [latestDateByContact, setLatestDateByContact] = useState<Record<string, number>>({});
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

  // Eng oxirgi amal bajarilgan kontakt birinchi chiqsin. Vaqti aniqlanmaganlar
  // (hali amal bo'lmagan) o'z tartibida pastda qoladi.
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      const dateA = latestDateByContact[a.id] ?? 0;
      const dateB = latestDateByContact[b.id] ?? 0;
      return dateB - dateA;
    });
  }, [filteredContacts, latestDateByContact]);

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
      const actorType: PartyType =
        workspace.mode === 'business' && workspace.activeBusinessId ? 'BUSINESS_ACCOUNT' : 'PROFILE';
      const actorId = actorType === 'BUSINESS_ACCOUNT' ? workspace.activeBusinessId || '' : profile?.id || '';
      return computeTotals(history, { type: actorType, id: actorId }, counterpartyId, counterpartyType);
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
      const nextDates: Record<string, number> = {};
      const queue = [...contacts];
      const workerCount = Math.min(5, queue.length);

      const maxCreatedDate = (items: MoneyResponseDTO[]): number => {
        let max = 0;
        for (const item of items) {
          const ts = new Date(item.createdDate).getTime();
          if (!Number.isNaN(ts) && ts > max) max = ts;
        }
        return max;
      };

      const loadAllHistory = async (id: string, partyType: PartyType): Promise<MoneyResponseDTO[]> => {
        const all: MoneyResponseDTO[] = [];
        let page = 0;
        let safety = 0;
        while (safety < 20) {
          const historyPage = await getMoneyHistory({
            id,
            partyType,
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
        return all;
      };

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
            let latestTs = 0;

            if (totals.totalDebt === 0 && totals.totalCredit === 0) {
              const all = await loadAllHistory(counterpartyId, counterpartyType);
              totals = computeTotalsFromHistory(all, counterpartyId, counterpartyType);
              latestTs = maxCreatedDate(all);
            }

            if (totals.totalDebt === 0 && totals.totalCredit === 0 && contact.id) {
              const all = await loadAllHistory(contact.id, 'PROFILE');
              totals = computeTotalsFromHistory(all, contact.id, 'PROFILE');
              latestTs = maxCreatedDate(all);
            }

            // Totals tezkor yo'l (price) orqali kelgan bo'lsa, tarix yuklanmagan —
            // saralash uchun eng oxirgi yozuvning sanasini alohida olamiz.
            if (!latestTs) {
              const head = await getMoneyHistory({
                id: counterpartyId,
                partyType: counterpartyType,
                page: 0,
                size: 1,
                token: profile.jwt,
                accountType,
              });
              latestTs = maxCreatedDate(head.content ?? []);
            }

            next[contact.id] = totals;
            if (latestTs) nextDates[contact.id] = latestTs;
          } catch {
            // ignore per-contact failure
          }
        }
      };

      try {
        await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
        if (!cancelled) {
          setTotalsByContact(next);
          setLatestDateByContact(nextDates);
        }
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

  const toggleNameSearch = () => {
    setActiveSearch((prev) => {
      if (prev === 'name') return null;
      setFilterPhone('');
      return 'name';
    });
  };

  const togglePhoneSearch = () => {
    setActiveSearch((prev) => {
      if (prev === 'phone') return null;
      setFilterName('');
      return 'phone';
    });
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

      const digits = phone.replace(/\D/g, '');
      const phoneError = getPhoneValidationError(phone);
      if (phoneError) {
        setLocalError(
          phoneError === 'empty'
            ? t('debts.enterPhone')
            : phoneError === 'prefix'
              ? t('debts.phone998')
              : t('debts.phoneLength')
        );
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
          <View style={styles.headerTools}>
            <TouchableOpacity
              style={[styles.searchToggle, activeSearch === 'name' && styles.searchToggleActive]}
              onPress={toggleNameSearch}
            >
              <Ionicons
                name="search"
                size={16}
                color={activeSearch === 'name' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.searchToggleText, activeSearch === 'name' && styles.searchToggleTextActive]}>
                ABC
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.searchToggle, activeSearch === 'phone' && styles.searchToggleActive]}
              onPress={togglePhoneSearch}
            >
              <Ionicons
                name="search"
                size={16}
                color={activeSearch === 'phone' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.searchToggleText, activeSearch === 'phone' && styles.searchToggleTextActive]}>
                123
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeSearch === 'name' ? (
          <AppTextInput
            label={t('debts.filterName')}
            value={filterName}
            onChangeText={setFilterName}
            placeholder={t('debts.min3letters')}
            containerStyle={styles.searchInput}
            style={styles.searchInputField}
            autoFocus
          />
        ) : null}
        {activeSearch === 'phone' ? (
          <AppTextInput
            label={t('debts.filterPhone')}
            value={filterPhone}
            onChangeText={(value) => setFilterPhone(value.replace(/\D/g, '').slice(0, 12))}
            keyboardType="phone-pad"
            placeholder={t('debts.min3digits')}
            containerStyle={styles.searchInput}
            style={styles.searchInputField}
            autoFocus
          />
        ) : null}

        <View style={styles.summaryCard}>
          <View style={styles.summaryTile}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.negativeSoft }]}>
              <Ionicons name="arrow-down" size={18} color={colors.negative} />
            </View>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryLabel}>{t('debts.currentDebt')}</Text>
              <Text style={[styles.summaryValue, { color: colors.negative }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(aggregateTotals.totalDebt)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryTile}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.positiveSoft }]}>
              <Ionicons name="arrow-up" size={18} color={colors.positive} />
            </View>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryLabel}>{t('debts.currentCredit')}</Text>
              <Text style={[styles.summaryValue, { color: colors.positive }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(aggregateTotals.totalCredit)}
              </Text>
            </View>
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
          ) : sortedContacts.length === 0 ? (
            <Text style={styles.emptyText}>{t('debts.emptyAccount')}</Text>
          ) : (
            sortedContacts.map((item, index) => {
              const balance = totalsByContact[item.id]?.balance;
              const hasBalance = typeof balance === 'number' && balance !== 0;
              const balanceColor = balance && balance > 0 ? colors.positive : balance && balance < 0 ? colors.negative : colors.textSecondary;
              const pillBg = balance && balance > 0 ? colors.positiveSoft : balance && balance < 0 ? colors.negativeSoft : colors.surfaceMuted;
              const avatar = pickAvatarColor(item.fullName || item.id);
              return (
                <View
                  key={item.id || `contact-${index}`}
                  style={[styles.row, index !== sortedContacts.length - 1 && styles.rowBorder]}
                >
                  <TouchableOpacity
                    style={styles.rowMain}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate(ROUTES.CONTACT_DETAIL, { id: item.id })}
                  >
                    <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                      <Text style={[styles.avatarText, { color: avatar.fg }]}>{getInitials(item.fullName)}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
                      <Text style={styles.phone} numberOfLines={1}>
                        {item.partyType === 'BUSINESS_ACCOUNT'
                          ? `${t('debts.businessLabel')}: ${item.partyId || '--'}`
                          : item.phone || item.partyId || '--'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.rowRight}>
                    <View style={[styles.balancePill, { backgroundColor: hasBalance ? pillBg : 'transparent' }]}>
                      <Text style={[styles.balancePillText, { color: balanceColor }]}>
                        {typeof balance === 'number' ? formatMoney(balance) : totalsLoading ? '...' : '--'}
                      </Text>
                    </View>
                    <View style={styles.actions}>
                      {canWrite(workspace.activeBusinessRole) ? (
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => openEdit(item.id)}
                          accessibilityRole="button"
                          accessibilityLabel={t('common.edit')}
                        >
                          <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      ) : null}
                      {canDelete(workspace.activeBusinessRole) ? (
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleDelete(item.id)}
                          disabled={deleting}
                          accessibilityRole="button"
                          accessibilityLabel={t('common.delete')}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.negative} />
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

      {canWrite(workspace.activeBusinessRole) ? (
        <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
          <Ionicons name="add" size={30} color={colors.textOnPrimary} />
        </TouchableOpacity>
      ) : null}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
          </ScrollView>
        </KeyboardAvoidingView>
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
    paddingBottom: 96,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  headerTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchToggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  searchToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  searchToggleTextActive: {
    color: colors.primary,
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
  searchInputField: {
    fontSize: 18,
    paddingVertical: 16,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  summaryTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: 14,
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
    color: colors.negative,
    fontSize: 13,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
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
    paddingVertical: 12,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  rowInfo: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  phone: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textSecondary,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  balancePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  balancePillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: 28,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  // Modal yuqoriroqda ochilsin — telefon klaviaturasi maydonlarni to'smasligi uchun.
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
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
    color: colors.negative,
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
