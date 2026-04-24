import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import AppTextInput from '../components/form/AppTextInput';
import PrimaryButton from '../components/ui/PrimaryButton';
import { SkeletonCardList } from '../components/ui/SkeletonShimmer';
import colors from '../styles/colors';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { ExpenseResponseDTO } from '../types/expense';
import { createExpense, deleteExpense, getExpensesByCategory } from '../services/expenseService';
import { formatMoney } from '../utils/money';

const ExpenseCategoryDetailScreen: React.FC<any> = ({ route }) => {
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const categoryId = String(route.params?.id ?? '');
  const categoryName = String(route.params?.name ?? '');
  const fromDate = String(route.params?.fromDate ?? '');
  const endDate = String(route.params?.endDate ?? '');
  const [expenses, setExpenses] = useState<ExpenseResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<string>('');
  const [error, setError] = useState('');
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadExpenses = useCallback(
    async (showSpinner = true) => {
      if (!profile?.jwt || !categoryId) {
        setExpenses([]);
        return;
      }
      const dateRange = resolveDateRange(fromDate, endDate);
      if (!dateRange.ok) {
        setError(dateRange.error);
        return;
      }
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const page = await getExpensesByCategory({
          id: categoryId,
          page: 1,
          size: 50,
          fromDate: dateRange.fromDate,
          endDate: dateRange.endDate,
          token: profile.jwt,
        });
        setExpenses(page.content ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Xarajatlarni yuklab bo'lmadi");
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [categoryId, profile?.jwt, fromDate, endDate, workspace.activeBusinessId, workspace.mode]
  );

  useEffect(() => {
    loadExpenses(true);
  }, [loadExpenses, workspace.activeBusinessId, workspace.mode]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses(true);
    }, [loadExpenses])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadExpenses(false);
    setRefreshing(false);
  }, [loadExpenses]);

  const openCreateExpense = () => {
    setAmount('');
    setDescription('');
    setExpenseModalVisible(true);
  };

  const closeExpenseModal = () => {
    setExpenseModalVisible(false);
    setAmount('');
    setDescription('');
  };

  const handleSaveExpense = async () => {
    if (!profile?.jwt) {
      setError('Token topilmadi. Qayta login qiling');
      return;
    }
    if (!categoryId) {
      setError('Kategoriya topilmadi');
      return;
    }
    const normalizedAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setError("Summa noto'g'ri");
      return;
    }

    setSavingExpense(true);
    setError('');
    try {
      await createExpense(
        {
          amount: normalizedAmount,
          description: description.trim(),
          categoryId,
        },
        profile.jwt
      );
      closeExpenseModal();
      await loadExpenses(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlab bo'lmadi");
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!profile?.jwt) {
      setError('Token topilmadi. Qayta login qiling');
      return;
    }
    setDeletingExpense(id);
    setError('');
    try {
      await deleteExpense(id, profile.jwt);
      setExpenses((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "O'chirib bo'lmadi");
    } finally {
      setDeletingExpense('');
    }
  };

  const sortedExpenses = useMemo(() => {
    const copy = [...expenses];
    copy.sort((a, b) => {
      const aDate = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const bDate = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      return bDate - aDate;
    });
    return copy;
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedExpenses;
    return sortedExpenses.filter((item) => {
      const descriptionText = (item.description || '').toLowerCase();
      const amountText = String(item.amount ?? '').toLowerCase();
      return descriptionText.includes(query) || amountText.includes(query);
    });
  }, [searchQuery, sortedExpenses]);

  const renderHeader = () => (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{categoryName || 'Xarajatlar'}</Text>
        <PrimaryButton title="Xarajat qo'shish" onPress={openCreateExpense} />
      </View>
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Xarajat qidirish"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <SkeletonCardList count={4} />
          ) : (
            <Text style={styles.emptyText}>Xarajat topilmadi</Text>
          )
        }
        renderItem={({ item }) => {
          const amountValue = typeof item.amount === 'string' ? Number(item.amount) : item.amount;
          return (
            <Card style={styles.expenseCard}>
              <View style={styles.expenseMain}>
                <Text style={styles.expenseAmount}>{formatMoney(amountValue || 0)}</Text>
                <Text style={styles.expenseDescription}>{item.description || 'Izoh yoq'}</Text>
                {item.createdDate ? (
                  <Text style={styles.expenseDate}>
                    {new Date(item.createdDate).toLocaleString()}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => handleDeleteExpense(item.id)}
                disabled={deletingExpense === item.id}
              >
                {deletingExpense === item.id ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                )}
              </TouchableOpacity>
            </Card>
          );
        }}
      />

      <Modal visible={expenseModalVisible} animationType="slide" transparent onRequestClose={closeExpenseModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Xarajat qo'shish</Text>
            <Text style={styles.modalHint}>
              Kategoriya: {categoryName || 'tanlanmagan'}
            </Text>
            <AppTextInput
              label="Summa"
              value={amount}
              onChangeText={(value) => setAmount(value.replace(/[^0-9.,]/g, ''))}
              placeholder="Masalan: 120000"
              keyboardType="numeric"
            />
            <AppTextInput
              label="Izoh"
              value={description}
              onChangeText={setDescription}
              placeholder="Masalan: Non va sut"
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Bekor qilish"
                variant="secondary"
                onPress={closeExpenseModal}
                style={styles.modalActionBtn}
              />
              <PrimaryButton
                title="Saqlash"
                onPress={handleSaveExpense}
                loading={savingExpense}
                style={styles.modalActionBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchRow: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorRow: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ffd7d5',
    backgroundColor: '#fff1f0',
    borderRadius: 10,
    marginBottom: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 20,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  expenseMain: {
    flex: 1,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.danger,
  },
  expenseDescription: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textPrimary,
  },
  expenseDate: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  modalHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalActionBtn: {
    flex: 1,
  },
});

function resolveDateRange(fromDate: string, endDate: string) {
  const normalizedFrom = fromDate?.trim() || '';
  const normalizedEnd = endDate?.trim() || '';
  if (normalizedFrom && !isValidDateInput(normalizedFrom)) {
    return { ok: false as const, error: "Boshlanish sana formati noto'g'ri. YYYY-MM-DD kiriting." };
  }
  if (normalizedEnd && !isValidDateInput(normalizedEnd)) {
    return { ok: false as const, error: "Tugash sana formati noto'g'ri. YYYY-MM-DD kiriting." };
  }
  if (normalizedFrom && normalizedEnd) {
    const fromValue = new Date(normalizedFrom);
    const endValue = new Date(normalizedEnd);
    if (Number.isNaN(fromValue.getTime()) || Number.isNaN(endValue.getTime())) {
      return { ok: false as const, error: "Sana noto'g'ri kiritilgan." };
    }
    if (endValue < fromValue) {
      return { ok: false as const, error: 'Tugash sana boshlanish sanasidan oldin bo‘lishi mumkin emas.' };
    }
  }
  return {
    ok: true as const,
    fromDate: normalizedFrom || undefined,
    endDate: normalizedEnd || undefined,
  };
}

function isValidDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default ExpenseCategoryDetailScreen;
