import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SkeletonCardList } from '../components/ui/SkeletonShimmer';
import WorkspaceSwitcher from '../components/business/WorkspaceSwitcher';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { CategoryResponseDTO } from '../types/category';
import { createCategory, deleteCategory, getCategories, pinCategory, updateCategory, updateCategoryPhoto } from '../services/categoryService';
import { getExpenseSumByCategory } from '../services/expenseService';
import { pickAndUploadImage } from './profile/pickImage';
import { ROUTES } from '../navigation/routes';
import type { ExpensesNavigation } from '../navigation/types';
import { canManageCategories } from '../utils/permissions';
import { useI18n } from '../i18n';
import {
  resolveDateRange,
  formatDateFromDate,
  getDefaultMonthRange,
  getCurrentWeekRange,
  buildDurationLabel,
} from '../utils/date';
import ExpenseTotalCard from './expenses/ExpenseTotalCard';
import DateRangeFilter from './expenses/DateRangeFilter';
import CategoryRow from './expenses/CategoryRow';
import CategoryFormModal from './expenses/CategoryFormModal';
import ConfirmDialog from './expenses/ConfirmDialog';
import QuickFilterModal, { QuickFilterKey } from './expenses/QuickFilterModal';
import ExpenseSortBar, { ExpenseSortKey, SortDir } from './expenses/ExpenseSortBar';

type CategoryMode = 'create' | 'edit';

const ExpensesScreen: React.FC<{ navigation: ExpensesNavigation }> = ({ navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);

  const [categories, setCategories] = useState<CategoryResponseDTO[]>([]);
  const [categorySums, setCategorySums] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string>('');
  const [pinningCategoryId, setPinningCategoryId] = useState<string>('');
  const [error, setError] = useState('');

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryMode, setCategoryMode] = useState<CategoryMode>('create');
  const [editingCategoryId, setEditingCategoryId] = useState('');

  const [fromDate, setFromDate] = useState(() => getDefaultMonthRange().fromDate);
  const [endDate, setEndDate] = useState(() => getDefaultMonthRange().endDate);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [filterError, setFilterError] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [quickFilterVisible, setQuickFilterVisible] = useState(false);

  const [expandedCategoryActionsId, setExpandedCategoryActionsId] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<{ id: string; name: string } | null>(null);

  // ---- Saralash holati ----
  // 'default' = pin yuqorida, qolgani asl tartibda. 'name' = A-Z/Z-A, 'sum' = katta/kichik.
  const [sortKey, setSortKey] = useState<ExpenseSortKey>('default');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const loadCategorySums = useCallback(
    async (nextCategories: CategoryResponseDTO[], nextFromDate?: string, nextEndDate?: string) => {
      if (!profile?.jwt || nextCategories.length === 0) {
        setCategorySums({});
        return;
      }

      const results = await Promise.allSettled(
        nextCategories.map((category) =>
          getExpenseSumByCategory({
            categoryId: category.id,
            fromDate: nextFromDate,
            endDate: nextEndDate,
            token: profile.jwt,
          })
        )
      );

      const nextSums: Record<string, number> = {};
      results.forEach((result, index) => {
        const categoryId = nextCategories[index]?.id;
        if (!categoryId) return;
        nextSums[categoryId] = result.status === 'fulfilled' ? toAmount(result.value.amount) : 0;
      });
      setCategorySums(nextSums);
    },
    [profile?.jwt]
  );

  const loadCategories = useCallback(async (showSpinner = true) => {
    if (!profile?.jwt) {
      setCategories([]);
      setCategorySums({});
      return;
    }
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const page = await getCategories({ page: 1, size: 50, token: profile.jwt });
      const next = page.content ?? [];
      setCategories(next);
      const dateRange = resolveDateRange(fromDate, endDate);
      if (dateRange.ok) {
        await loadCategorySums(next, dateRange.fromDate, dateRange.endDate);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('expenses.loadFailed'));
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [profile?.jwt, fromDate, endDate, loadCategorySums, t]);

  useEffect(() => {
    loadCategories(true);
  }, [loadCategories, workspace.activeBusinessId, workspace.mode]);

  useFocusEffect(
    useCallback(() => {
      setExpandedCategoryActionsId(null);
      loadCategories(true);
      return () => {
        setExpandedCategoryActionsId(null);
      };
    }, [loadCategories])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories(false);
    setRefreshing(false);
  }, [loadCategories]);

  const editingName = useMemo(
    () => categories.find((c) => c.id === editingCategoryId)?.name ?? '',
    [categories, editingCategoryId]
  );

  const openCreateCategory = useCallback(() => {
    setCategoryMode('create');
    setEditingCategoryId('');
    setCategoryModalVisible(true);
  }, []);

  const openEditCategory = useCallback((category: CategoryResponseDTO) => {
    setCategoryMode('edit');
    setEditingCategoryId(category.id);
    setCategoryModalVisible(true);
  }, []);

  const closeCategoryModal = useCallback(() => {
    setCategoryModalVisible(false);
    setEditingCategoryId('');
  }, []);

  const submitCategory = useCallback(
    async (name: string): Promise<boolean> => {
      if (!profile?.jwt) {
        setError(t('expenses.noToken'));
        return false;
      }
      setSavingCategory(true);
      setError('');
      try {
        if (categoryMode === 'create') {
          await createCategory({ name }, profile.jwt);
        } else {
          await updateCategory({ id: editingCategoryId, name }, profile.jwt);
        }
        await loadCategories(true);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('expenses.saveFailed'));
        return false;
      } finally {
        setSavingCategory(false);
      }
    },
    [profile?.jwt, categoryMode, editingCategoryId, loadCategories, t]
  );

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      if (!profile?.jwt) {
        setError(t('expenses.noToken'));
        return;
      }
      setDeletingCategory(id);
      setError('');
      try {
        await deleteCategory(id, profile.jwt);
        await loadCategories(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('expenses.deleteFailed'));
      } finally {
        setDeletingCategory('');
      }
    },
    [profile?.jwt, loadCategories, t]
  );

  // Kategoriya avatariga bosilganda: galereyadan rasm tanlab yuklaydi va backendда
  // saqlaydi. Ruxsat (OWNER/shaxsiy) bo'lmasa chaqirilmaydi (avatar bosilmaydi).
  const [photoUploadingId, setPhotoUploadingId] = useState<string>('');
  const handleChangeCategoryPhoto = useCallback(
    async (category: CategoryResponseDTO) => {
      if (!profile?.jwt) {
        setError(t('expenses.noToken'));
        return;
      }
      setPhotoUploadingId(category.id);
      setError('');
      try {
        const result = await pickAndUploadImage(profile.jwt);
        if (result.status === 'canceled') return;
        if (result.status !== 'ok') {
          setError(result.status === 'denied' ? t('expenses.photoPermission') : t('expenses.photoFailed'));
          return;
        }
        await updateCategoryPhoto(category.id, result.id, profile.jwt);
        setCategories((prev) =>
          prev.map((item) => (item.id === category.id ? { ...item, photoId: result.id } : item)),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : t('expenses.photoFailed'));
      } finally {
        setPhotoUploadingId('');
      }
    },
    [profile?.jwt, t],
  );

  const handleTogglePinCategory = useCallback(
    async (category: CategoryResponseDTO) => {
      if (!profile?.jwt) {
        setError(t('expenses.noToken'));
        return;
      }
      setPinningCategoryId(category.id);
      setError('');
      const nextPin = !Boolean(category.pin);
      try {
        await pinCategory({ id: category.id, pin: nextPin }, profile.jwt);
        setCategories((prev) => prev.map((item) => (item.id === category.id ? { ...item, pin: nextPin } : item)));
      } catch (e) {
        setError(e instanceof Error ? e.message : t('expenses.pinFailed'));
      } finally {
        setPinningCategoryId('');
      }
    },
    [profile?.jwt, t]
  );

  const cancelDeleteCategory = useCallback(() => {
    setDeleteConfirmVisible(false);
    setPendingDeleteCategory(null);
  }, []);

  const confirmDeleteCategory = useCallback(async () => {
    if (!pendingDeleteCategory) return;
    const targetId = pendingDeleteCategory.id;
    cancelDeleteCategory();
    await handleDeleteCategory(targetId);
  }, [pendingDeleteCategory, cancelDeleteCategory, handleDeleteCategory]);

  const handleApplyFilter = useCallback(async () => {
    const dateRange = resolveDateRange(fromDate, endDate);
    if (!dateRange.ok) {
      setFilterError(dateRange.error);
      return;
    }
    setFilterError('');
    await loadCategorySums(categories, dateRange.fromDate, dateRange.endDate);
  }, [fromDate, endDate, loadCategorySums, categories]);

  const handleQuickFilterSelect = useCallback(
    async (key: QuickFilterKey) => {
      setQuickFilterVisible(false);
      setFilterError('');

      if (key === 'customRange') {
        setFilterPanelOpen(true);
        if (Platform.OS !== 'web') setShowFromPicker(true);
        return;
      }

      const today = new Date();
      const endValue = formatDateFromDate(today);
      let fromValue = endValue;
      if (key === 'currentWeek') {
        fromValue = getCurrentWeekRange(today).fromDate;
      } else if (key === 'currentMonth') {
        fromValue = formatDateFromDate(new Date(today.getFullYear(), today.getMonth(), 1));
      }

      setFromDate(fromValue);
      setEndDate(endValue);
      setFilterPanelOpen(false);
      await loadCategorySums(categories, fromValue, endValue);
    },
    [loadCategorySums, categories]
  );

  const handleOpenCategory = useCallback(
    (category: CategoryResponseDTO) => {
      const dateRange = resolveDateRange(fromDate, endDate);
      if (!dateRange.ok) {
        setFilterError(dateRange.error);
        return;
      }
      setFilterError('');
      navigation.navigate(ROUTES.EXPENSE_CATEGORY_DETAIL, {
        id: category.id,
        name: category.name,
        fromDate: dateRange.fromDate,
        endDate: dateRange.endDate,
      });
    },
    [fromDate, endDate, navigation]
  );

  const toggleCategoryActions = useCallback(
    (id: string) => setExpandedCategoryActionsId((prev) => (prev === id ? null : id)),
    []
  );

  const pinFromRow = useCallback(
    (category: CategoryResponseDTO) => {
      setExpandedCategoryActionsId(null);
      handleTogglePinCategory(category);
    },
    [handleTogglePinCategory]
  );

  const editFromRow = useCallback(
    (category: CategoryResponseDTO) => {
      setExpandedCategoryActionsId(null);
      openEditCategory(category);
    },
    [openEditCategory]
  );

  const deleteFromRow = useCallback((category: CategoryResponseDTO) => {
    setExpandedCategoryActionsId(null);
    setPendingDeleteCategory({ id: category.id, name: category.name });
    setDeleteConfirmVisible(true);
  }, []);

  // Nom chipini bosish: boshqa kalitdan kelsa nom + A-Z, aks holda yo'nalishni almashtiradi.
  const toggleNameSort = useCallback(() => {
    if (sortKey === 'name') {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey('name');
      setSortDir('asc');
    }
  }, [sortKey]);

  // Summa chipini bosish: standart yo'nalish — kattadan kichikka (desc).
  const toggleSumSort = useCallback(() => {
    if (sortKey === 'sum') {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey('sum');
      setSortDir('desc');
    }
  }, [sortKey]);

  const resetSort = useCallback(() => {
    setSortKey('default');
    setSortDir('asc');
  }, []);

  // Odatiy holatda pin === true yuqorida (asl tartibda), qolganlari o'z o'rnida.
  // Nom/summa tanlansa — butun ro'yxat o'sha kalit bo'yicha sof saralanadi.
  const sortedCategories = useMemo(() => {
    if (sortKey === 'default') {
      const pinned = categories.filter((c) => c.pin === true);
      const others = categories.filter((c) => c.pin !== true);
      return [...pinned, ...others];
    }
    const cmp = (a: CategoryResponseDTO, b: CategoryResponseDTO): number => {
      const r =
        sortKey === 'name'
          ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          : (categorySums[a.id] ?? 0) - (categorySums[b.id] ?? 0);
      return sortDir === 'asc' ? r : -r;
    };
    return [...categories].sort(cmp);
  }, [categories, categorySums, sortKey, sortDir]);

  const totalExpenseAmount = useMemo(
    () => Object.values(categorySums).reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0),
    [categorySums]
  );

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const values: string[] = [];
    for (let y = currentYear - 10; y <= currentYear + 1; y += 1) values.push(String(y));
    return values;
  }, []);

  const hasActiveDateFilter = Boolean(fromDate || endDate);
  const dateFilterSummary = useMemo(
    () => (hasActiveDateFilter ? `${fromDate || '---'} → ${endDate || '---'}` : t('expenses.noFilter')),
    [endDate, fromDate, hasActiveDateFilter, t]
  );

  const totalLabelText = useMemo(() => {
    const duration = buildDurationLabel(fromDate, endDate);
    return duration ? `${t('expenses.totalLabel')} (${duration}):` : `${t('expenses.totalLabel')}:`;
  }, [endDate, fromDate, t]);

  // Kategoriya boshqaruvi (yaratish/tahrirlash/o'chirish/pin) faqat OWNER (yoki shaxsiy hisob) uchun.
  const allowCategoryManage = canManageCategories(workspace.activeBusinessRole);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <WorkspaceSwitcher />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('expenses.dailyTitle')}</Text>
        </View>

        <ExpenseTotalCard
          label={totalLabelText}
          amount={totalExpenseAmount}
          onMenuPress={() => setQuickFilterVisible(true)}
        />

        <DateRangeFilter
          open={filterPanelOpen}
          onToggle={() => setFilterPanelOpen((prev) => !prev)}
          summaryText={dateFilterSummary}
          hasActiveFilter={hasActiveDateFilter}
          fromDate={fromDate}
          endDate={endDate}
          yearOptions={yearOptions}
          showFromPicker={showFromPicker}
          showEndPicker={showEndPicker}
          error={filterError}
          onFromDateChange={setFromDate}
          onEndDateChange={setEndDate}
          onShowFromPicker={setShowFromPicker}
          onShowEndPicker={setShowEndPicker}
          onApply={handleApplyFilter}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {error ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{t('expenses.categories')}</Text>

        {!loading && sortedCategories.length > 0 ? (
          <ExpenseSortBar
            sortKey={sortKey}
            sortDir={sortDir}
            onToggleName={toggleNameSort}
            onToggleSum={toggleSumSort}
            onReset={resetSort}
          />
        ) : null}

        <View style={styles.listCard}>
          {loading ? (
            <SkeletonCardList count={5} containerStyle={styles.listSkeleton} />
          ) : sortedCategories.length === 0 ? (
            <Text style={styles.emptyText}>{t('expenses.noCategories')}</Text>
          ) : (
            sortedCategories.map((item, index) => (
              <CategoryRow
                key={item.id}
                category={item}
                sum={categorySums[item.id] ?? 0}
                isLast={index === sortedCategories.length - 1}
                allowManage={allowCategoryManage}
                expanded={expandedCategoryActionsId === item.id}
                pinning={pinningCategoryId === item.id}
                deleting={deletingCategory === item.id}
                photoUploading={photoUploadingId === item.id}
                onOpen={handleOpenCategory}
                onToggleExpand={toggleCategoryActions}
                onTogglePin={pinFromRow}
                onEdit={editFromRow}
                onRequestDelete={deleteFromRow}
                onChangePhoto={handleChangeCategoryPhoto}
              />
            ))
          )}
        </View>
      </ScrollView>

      {allowCategoryManage ? (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={openCreateCategory}
          accessibilityRole="button"
          accessibilityLabel={t('expenses.addCategory')}
        >
          <Ionicons name="add" size={30} color={colors.textOnPrimary} />
        </Pressable>
      ) : null}

      <CategoryFormModal
        visible={categoryModalVisible}
        mode={categoryMode}
        initialName={editingName}
        submitting={savingCategory}
        onClose={closeCategoryModal}
        onSubmit={submitCategory}
      />

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title={t('expenses.deleteCategory')}
        message={t('expenses.deleteConfirm', { name: pendingDeleteCategory?.name || t('expenses.thisCategory') })}
        confirmLabel={t('common.delete')}
        loading={Boolean(pendingDeleteCategory && deletingCategory === pendingDeleteCategory.id)}
        danger
        onCancel={cancelDeleteCategory}
        onConfirm={confirmDeleteCategory}
      />

      <QuickFilterModal
        visible={quickFilterVisible}
        onClose={() => setQuickFilterVisible(false)}
        onSelect={handleQuickFilterSelect}
      />
    </View>
  );
};

function toAmount(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.lg,
    },
    errorRow: {
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerMuted,
      borderRadius: radius.sm,
      marginBottom: spacing.md,
    },
    errorText: {
      ...typography.caption,
      fontSize: 13,
      color: colors.danger,
    },
    sectionTitle: {
      ...typography.button,
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    listCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      paddingVertical: spacing.xxs,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
      overflow: 'hidden',
    },
    listSkeleton: {
      padding: spacing.sm,
    },
    emptyText: {
      ...typography.body,
      textAlign: 'center',
      color: colors.textSecondary,
      paddingVertical: spacing.lg,
    },
    fab: {
      position: 'absolute',
      right: spacing.md + 2,
      bottom: spacing.lg,
      width: 60,
      height: 60,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
    fabPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
  });

export default ExpensesScreen;
