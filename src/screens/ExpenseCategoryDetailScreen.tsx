import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
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
import { useAppTheme } from '../theme';
import { ColorTokens } from '../theme/colors';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { ExpenseResponseDTO } from '../types/expense';
import { createExpense, deleteExpense, getExpensesByCategory } from '../services/expenseService';
import { formatMoney } from '../utils/money';
import { canWrite, canDelete } from '../utils/permissions';
import { confirmAction } from '../utils/confirm';
import { useI18n } from '../i18n';
import { resolveDateRange } from '../utils/date';
import { formatPhoneDisplay } from '../utils/phone';

// Kiritilgan summani "12 331 323" ko'rinishida (har 3 raqamda bo'sh joy) formatlaydi.
const formatAmountInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const ExpenseCategoryDetailScreen: React.FC<any> = ({ route }) => {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        setError(e instanceof Error ? e.message : t('expenses.loadExpensesFailed'));
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
      setError(t('expenses.noToken'));
      return;
    }
    if (!categoryId) {
      setError(t('expenses.noCategories'));
      return;
    }
    const normalizedAmount = Number(amount.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setError(t('expenses.amountInvalid'));
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
      setError(e instanceof Error ? e.message : t('expenses.saveFailed'));
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!profile?.jwt) {
      setError(t('expenses.noToken'));
      return;
    }
    setDeletingExpense(id);
    setError('');
    try {
      await deleteExpense(id, profile.jwt);
      setExpenses((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('expenses.deleteFailed'));
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

  // ADMIN xarajat qo'sha oladi (yozish), lekin o'chirish faqat OWNER.
  const role = workspace.activeBusinessRole;
  const allowWrite = canWrite(role);
  const allowDelete = canDelete(role);

  return (
    <View style={styles.container}>
      <View style={styles.fixedHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{categoryName || t('expenses.title')}</Text>
          {allowWrite ? <PrimaryButton title={t('expenses.addExpense')} onPress={openCreateExpense} /> : null}
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('expenses.searchExpense')}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {error ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <SkeletonCardList count={4} />
          ) : (
            <Text style={styles.emptyText}>{t('expenses.noExpenses')}</Text>
          )
        }
        renderItem={({ item }) => {
          const amountValue = typeof item.amount === 'string' ? Number(item.amount) : item.amount;
          return (
            <Card style={styles.expenseCard}>
              <View style={styles.expenseMain}>
                <Text style={styles.expenseAmount}>{formatMoney(amountValue || 0)}</Text>
                <Text style={styles.expenseDescription}>{item.description || t('expenses.noComment')}</Text>
                {item.createdDate ? (
                  <Text style={styles.expenseDate}>
                    {new Date(item.createdDate).toLocaleString()}
                  </Text>
                ) : null}
                {item.creatorPhone ? (
                  <Text style={styles.expenseCreator}>{t('expenses.addedBy')}: {formatPhoneDisplay(item.creatorPhone)}</Text>
                ) : null}
              </View>
              {allowDelete ? (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() =>
                    confirmAction(t('expenses.deleteExpenseConfirm'), () => handleDeleteExpense(item.id))
                  }
                  disabled={deletingExpense === item.id}
                >
                  {deletingExpense === item.id ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  )}
                </TouchableOpacity>
              ) : null}
            </Card>
          );
        }}
      />

      <Modal visible={expenseModalVisible} animationType="slide" transparent onRequestClose={closeExpenseModal}>
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
            <Text style={styles.modalTitle}>{t('expenses.addExpense')}</Text>
            <Text style={styles.modalHint}>
              {t('expenses.categoryColon')}: {categoryName || t('expenses.notSelected')}
            </Text>
            <AppTextInput
              label={t('expenses.amountLabel')}
              value={amount}
              onChangeText={(value) => setAmount(formatAmountInput(value))}
              placeholder={t('expenses.amountExample')}
              keyboardType="numeric"
            />
            <AppTextInput
              label={t('expenses.commentLabel')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('expenses.commentExample')}
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title={t('common.cancel')}
                variant="secondary"
                onPress={closeExpenseModal}
                style={styles.modalActionBtn}
              />
              <PrimaryButton
                title={t('common.save')}
                onPress={handleSaveExpense}
                loading={savingExpense}
                style={styles.modalActionBtn}
              />
            </View>
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
  fixedHeader: {
    padding: 16,
    paddingBottom: 8,
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
    backgroundColor: colors.surface,
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
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
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
  expenseCreator: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  // Oyna yuqoriroqda ochilsin — telefon klaviaturasi maydonlarni to'smasligi uchun.
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

export default ExpenseCategoryDetailScreen;
