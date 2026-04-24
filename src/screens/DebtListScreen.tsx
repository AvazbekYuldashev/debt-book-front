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
import colors from '../styles/colors';
import { ROUTES } from '../navigation/routes';
import { getMoneyHistory, getTotalPriceByCreditorId } from '../services/moneyService';
import { getProfileByPhone } from '../services/profileService';
import { extractMoneyTotals, formatMoney } from '../utils/money';
import { MoneyPriceDTO, MoneyResponseDTO } from '../types/money';

type Mode = 'create' | 'edit';

const POSITIVE = '#0D9488';
const NEGATIVE = '#EF4444';

const normalizePhoneForCompare = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 9) return `998${digits}`;
  return digits;
};

const DebtListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { profile } = useContext(AuthContext);
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

  const resolveCounterpartyId = useCallback(
    async (contact: { creditorId?: string; debtorId?: string; phone: string }): Promise<string> => {
      const creditorId = contact.creditorId?.trim() || '';
      const debtorId = contact.debtorId?.trim() || '';
      const myId = profile?.id?.trim() || '';
      const byRole =
        creditorId && creditorId !== myId
          ? creditorId
          : debtorId && debtorId !== myId
            ? debtorId
            : '';
      if (byRole) return byRole;
      if (!profile?.jwt || !contact.phone) return '';
      const resolved = await getProfileByPhone(contact.phone, profile.jwt);
      return resolved.id || '';
    },
    [profile?.id, profile?.jwt]
  );

  const computeTotalsFromHistory = useCallback(
    (history: MoneyResponseDTO[], counterpartyId: string) => {
      let totalDebt = 0;
      let totalCredit = 0;

      for (const item of history) {
        let isCreditor = Boolean(profile?.id && item.creditorId === profile.id);
        let isDebtor = Boolean(profile?.id && item.debtorId === profile.id);

        if (!isCreditor && !isDebtor && counterpartyId) {
          if (item.debtorId === counterpartyId) isCreditor = true;
          if (item.creditorId === counterpartyId) isDebtor = true;
        }

        if (isCreditor) totalCredit += item.amount;
        if (isDebtor) totalDebt += item.amount;
      }

      return { totalDebt, totalCredit, balance: totalCredit - totalDebt };
    },
    [profile?.id]
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
            const counterpartyId = await resolveCounterpartyId(contact);
            if (!counterpartyId) continue;

            const price = (await getTotalPriceByCreditorId(counterpartyId, profile.jwt)) as MoneyPriceDTO;
            let totals = extractMoneyTotals(price ?? null);

            if (totals.totalDebt === 0 && totals.totalCredit === 0) {
              const creditorId = contact.creditorId?.trim() || '';
              const debtorId = contact.debtorId?.trim() || '';
              const otherId =
                counterpartyId === creditorId ? debtorId : counterpartyId === debtorId ? creditorId : '';
              if (otherId) {
                const priceAlt = (await getTotalPriceByCreditorId(otherId, profile.jwt)) as MoneyPriceDTO;
                const totalsAlt = extractMoneyTotals(priceAlt ?? null);
                if (totalsAlt.totalDebt !== 0 || totalsAlt.totalCredit !== 0) totals = totalsAlt;
              }
            }

            if (totals.totalDebt === 0 && totals.totalCredit === 0) {
              const all: MoneyResponseDTO[] = [];
              let page = 1;
              let safety = 0;
              while (safety < 20) {
                const historyPage = await getMoneyHistory({
                  id: counterpartyId,
                  page,
                  size: 100,
                  token: profile.jwt,
                });
                all.push(...(historyPage.content ?? []));
                if (historyPage.last || historyPage.totalPages <= page) break;
                page += 1;
                safety += 1;
              }
              totals = computeTotalsFromHistory(all, counterpartyId);
            }

            if (totals.totalDebt === 0 && totals.totalCredit === 0 && contact.id) {
              const all: MoneyResponseDTO[] = [];
              let page = 1;
              let safety = 0;
              while (safety < 20) {
                const historyPage = await getMoneyHistory({
                  id: contact.id,
                  page,
                  size: 100,
                  token: profile.jwt,
                });
                all.push(...(historyPage.content ?? []));
                if (historyPage.last || historyPage.totalPages <= page) break;
                page += 1;
                safety += 1;
              }
              totals = computeTotalsFromHistory(all, contact.id);
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
  }, [computeTotalsFromHistory, contacts, profile?.jwt, resolveCounterpartyId, totalsKey]);

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
          setLocalError(e instanceof Error ? e.message : 'Qidiruvda xatolik yuz berdi');
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
      setLocalError(mode === 'create' ? 'Ism va telefonni kiriting' : 'Ismni kiriting');
      return;
    }

    if (mode === 'create') {
      if (!phone.trim()) {
        setLocalError('Ism va telefonni kiriting');
        return;
      }

      const normalizedPhone = normalizePhoneForCompare(phone);
      const duplicate = contacts.some(
        (contact) => normalizePhoneForCompare(contact.phone) === normalizedPhone
      );
      if (duplicate) {
        setLocalError('Bu mijoz tizimda mavjud.');
        return;
      }
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 9 && digits.length !== 12) {
        setLocalError("Telefon 9 yoki 12 xonali bo'lishi kerak");
        return;
      }

      if (digits.length === 12 && !digits.startsWith('998')) {
        setLocalError("12 xonali telefon 998 bilan boshlanishi kerak");
        return;
      }

      const ok = await addContact({
        name: name.trim(),
        phone: digits,
      });

      if (ok) closeModal();
      return;
    }

    const ok = await updateContact(selectedId, { name: name.trim() });

    if (ok) closeModal();
  };

  const handleDelete = async (id: string) => {
    await deleteContact(id);
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
          <Text style={styles.title}>Clientlar</Text>
          <TouchableOpacity style={styles.headerAction} onPress={openCreate}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.headerActionText}>Qo'shish</Text>
          </TouchableOpacity>
        </View>

        <AppTextInput
          label="Ism bo'yicha filter"
          value={filterName}
          onChangeText={setFilterName}
          placeholder="Kamida 3 ta harf kiriting"
          containerStyle={styles.searchInput}
        />
        <AppTextInput
          label="Telefon bo'yicha filter"
          value={filterPhone}
          onChangeText={(value) => setFilterPhone(value.replace(/\D/g, '').slice(0, 12))}
          keyboardType="phone-pad"
          placeholder="Kamida 3 ta raqam kiriting"
          containerStyle={styles.searchInput}
        />

        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Hozirgi Qarz</Text>
            <Text style={[styles.summaryValue, { color: NEGATIVE }]}>{formatMoney(aggregateTotals.totalDebt)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Hozirgi Haq</Text>
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
            <Text style={styles.emptyText}>Clientlar topilmadi</Text>
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
                    <Text style={styles.phone}>{item.phone}</Text>
                  </TouchableOpacity>

                  <View style={styles.rowRight}>
                    <Text style={[styles.balanceText, { color: balanceColor }]}>
                      {typeof balance === 'number' ? formatMoney(balance) : totalsLoading ? '...' : '--'}
                    </Text>
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item.id)}>
                        <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item.id)} disabled={deleting}>
                        <Ionicons name="trash-outline" size={16} color={NEGATIVE} />
                      </TouchableOpacity>
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
              {mode === 'create' ? "Yangi client qo'shish" : "Clientni o'zgartirish"}
            </Text>
            <AppTextInput label="Ism familiya" value={name} onChangeText={setName} placeholder="Ali Valiyev" />
            {mode === 'create' ? (
              <AppTextInput
                label="Telefon"
                value={phone}
                onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 12))}
                keyboardType="phone-pad"
                placeholder="901234567 yoki 998901234567"
              />
            ) : null}
            {localError ? <Text style={styles.localError}>{localError}</Text> : null}
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Bekor qilish"
                variant="secondary"
                onPress={closeModal}
                style={styles.modalActionBtn}
              />
              <PrimaryButton
                title={mode === 'create' ? "Qo'shish" : 'Saqlash'}
                onPress={handleSave}
                loading={creating || updating}
                style={styles.modalActionBtn}
              />
            </View>
            {mode === 'edit' && selectedContact ? (
              <Text style={styles.editHint}>Kontakt yangilanmoqda</Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    color: '#111827',
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
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
    backgroundColor: '#FFFFFF',
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
    color: '#6B7280',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
  },
  errorRow: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: NEGATIVE,
    fontSize: 13,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    borderBottomColor: '#F3F4F6',
  },
  rowMain: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  phone: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
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
    backgroundColor: '#F9FAFB',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#6B7280',
  },
});

export default DebtListScreen;
