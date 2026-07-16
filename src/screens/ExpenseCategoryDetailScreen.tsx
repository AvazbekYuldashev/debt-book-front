import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/atoms/Button';
import ScreenHeader from '../components/atoms/ScreenHeader';
import { SkeletonCardList } from '../components/ui/SkeletonShimmer';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { ExpenseResponseDTO } from '../types/expense';
import { createExpense, deleteExpense, getExpensesByCategory } from '../services/expenseService';
import { canWrite, canDelete } from '../utils/permissions';
import { confirmAction } from '../utils/confirm';
import { useI18n } from '../i18n';
import { resolveDateRange } from '../utils/date';
import type { ExpensesScreenProps } from '../navigation/types';
import { ROUTES } from '../navigation/routes';
import ExpenseRow from './expenses/ExpenseRow';
import ExpenseFormModal from './expenses/ExpenseFormModal';

type Props = ExpensesScreenProps<typeof ROUTES.EXPENSE_CATEGORY_DETAIL>;

const ExpenseCategoryDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);

  const categoryId = route.params.id;
  const categoryName = route.params.name;
  const fromDate = route.params.fromDate ?? '';
  const endDate = route.params.endDate ?? '';

  const [expenses, setExpenses] = useState<ExpenseResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<string>('');
  const [error, setError] = useState('');
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
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
    [categoryId, profile?.jwt, fromDate, endDate, workspace.activeBusinessId, workspace.mode, t]
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

  const submitExpense = useCallback(
    async (amount: number, description: string): Promise<boolean> => {
      if (!profile?.jwt) {
        setError(t('expenses.noToken'));
        return false;
      }
      if (!categoryId) {
        setError(t('expenses.noCategories'));
        return false;
      }
      setSavingExpense(true);
      setError('');
      try {
        await createExpense({ amount, description, categoryId }, profile.jwt);
        await loadExpenses(true);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('expenses.saveFailed'));
        return false;
      } finally {
        setSavingExpense(false);
      }
    },
    [profile?.jwt, categoryId, loadExpenses, t]
  );

  const handleDeleteExpense = useCallback(
    async (id: string) => {
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
    },
    [profile?.jwt, t]
  );

  const requestDeleteExpense = useCallback(
    (id: string) => confirmAction(t('expenses.deleteExpenseConfirm'), () => handleDeleteExpense(id)),
    [t, handleDeleteExpense]
  );

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const aDate = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const bDate = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      return bDate - aDate;
    });
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
      <View style={styles.header}>
        <ScreenHeader
          title={categoryName || t('expenses.title')}
          onBack={navigation.goBack}
          right={
            allowWrite ? (
              <Button title={t('expenses.addExpense')} onPress={() => setExpenseModalVisible(true)} />
            ) : null
          }
        />

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
          loading ? <SkeletonCardList count={4} /> : <Text style={styles.emptyText}>{t('expenses.noExpenses')}</Text>
        }
        renderItem={({ item }) => (
          <ExpenseRow
            expense={item}
            allowDelete={allowDelete}
            deleting={deletingExpense === item.id}
            onDelete={requestDeleteExpense}
          />
        )}
      />

      <ExpenseFormModal
        visible={expenseModalVisible}
        categoryName={categoryName}
        submitting={savingExpense}
        onClose={() => setExpenseModalVisible(false)}
        onSubmit={submitExpense}
      />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.background,
    },
    searchRow: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.xs,
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    searchInput: {
      ...typography.bodySmall,
      flex: 1,
      color: colors.textPrimary,
      paddingVertical: spacing.xs,
    },
    errorRow: {
      marginHorizontal: spacing.md,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerMuted,
      borderRadius: radius.sm,
      marginBottom: spacing.xs,
    },
    errorText: {
      ...typography.caption,
      fontSize: 13,
      color: colors.danger,
    },
    listContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
    },
    emptyText: {
      ...typography.body,
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: spacing.lg,
    },
  });

export default ExpenseCategoryDetailScreen;
