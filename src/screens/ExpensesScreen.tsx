import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useAppTheme } from '../theme';
import { ColorTokens } from '../theme/colors';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { CategoryResponseDTO } from '../types/category';
import { createCategory, deleteCategory, getCategories, pinCategory, updateCategory } from '../services/categoryService';
import { getExpenseSumByCategory } from '../services/expenseService';
import { ROUTES } from '../navigation/routes';
import { formatMoney } from '../utils/money';
import { canManageCategories } from '../utils/permissions';
import { useI18n } from '../i18n';
import { resolveDateRange, isValidDateInput } from '../utils/date';
import { getInitials, pickAvatarColor } from '../shared/ui/avatar';

const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;


type CategoryMode = 'create' | 'edit';
type QuickFilterKey = 'today' | 'currentWeek' | 'currentMonth' | 'customRange';

const ExpensesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const [categories, setCategories] = useState<CategoryResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string>('');
  const [error, setError] = useState('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryMode, setCategoryMode] = useState<CategoryMode>('create');
  const [categoryName, setCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [fromDate, setFromDate] = useState(() => getDefaultMonthRange().fromDate);
  const [endDate, setEndDate] = useState(() => getDefaultMonthRange().endDate);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [filterError, setFilterError] = useState('');
  const [categorySums, setCategorySums] = useState<Record<string, number>>({});
  const [quickFilterVisible, setQuickFilterVisible] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [expandedCategoryActionsId, setExpandedCategoryActionsId] = useState<string | null>(null);
  const [pinningCategoryId, setPinningCategoryId] = useState<string>('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<{ id: string; name: string } | null>(null);

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
  }, [profile?.jwt, fromDate, endDate, loadCategorySums, workspace.activeBusinessId, workspace.mode]);

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

  const openCreateCategory = () => {
    setCategoryMode('create');
    setCategoryName('');
    setCategoryModalVisible(true);
  };

  const openEditCategory = (category: CategoryResponseDTO) => {
    setCategoryMode('edit');
    setEditingCategoryId(category.id);
    setCategoryName(category.name || '');
    setCategoryModalVisible(true);
  };

  const closeCategoryModal = () => {
    setCategoryModalVisible(false);
    setCategoryName('');
    setEditingCategoryId('');
  };

  const handleSaveCategory = async () => {
    if (!profile?.jwt) {
      setError(t('expenses.noToken'));
      return;
    }
    if (!categoryName.trim()) {
      setError(t('expenses.enterCategoryName'));
      return;
    }

    setSavingCategory(true);
    setError('');
    try {
      if (categoryMode === 'create') {
        await createCategory({ name: categoryName.trim() }, profile.jwt);
      } else {
        await updateCategory({ id: editingCategoryId, name: categoryName.trim() }, profile.jwt);
      }
      closeCategoryModal();
      await loadCategories(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('expenses.saveFailed'));
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
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
  };

  const handleTogglePinCategory = async (category: CategoryResponseDTO) => {
    if (!profile?.jwt) {
      setError(t('expenses.noToken'));
      return;
    }
    setPinningCategoryId(category.id);
    setError('');
    const nextPin = !Boolean(category.pin);
    try {
      await pinCategory({ id: category.id, pin: nextPin }, profile.jwt);
      setCategories((prev) =>
        prev.map((item) => (item.id === category.id ? { ...item, pin: nextPin } : item))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('expenses.pinFailed'));
    } finally {
      setPinningCategoryId('');
    }
  };

  const requestDeleteCategory = (category: CategoryResponseDTO) => {
    setPendingDeleteCategory({ id: category.id, name: category.name });
    setDeleteConfirmVisible(true);
  };

  const cancelDeleteCategory = () => {
    setDeleteConfirmVisible(false);
    setPendingDeleteCategory(null);
  };

  const confirmDeleteCategory = async () => {
    if (!pendingDeleteCategory) return;
    const targetId = pendingDeleteCategory.id;
    cancelDeleteCategory();
    await handleDeleteCategory(targetId);
  };

  const handleApplyFilter = async () => {
    const dateRange = resolveDateRange(fromDate, endDate);
    if (!dateRange.ok) {
      setFilterError(dateRange.error);
      return;
    }
    setFilterError('');
    await loadCategorySums(categories, dateRange.fromDate, dateRange.endDate);
  };

  const handleQuickFilterSelect = async (key: QuickFilterKey) => {
    setQuickFilterVisible(false);
    setFilterError('');

    if (key === 'customRange') {
      setFilterPanelOpen(true);
      if (Platform.OS !== 'web') {
        setShowFromPicker(true);
      }
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
  };

  const handleOpenCategory = (category: CategoryResponseDTO) => {
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
  };

  // pin === true bo'lganlar yuqorida (o'z tartibida), qolganlari (false/null) o'z o'rnida qoladi.
  const sortedCategories = useMemo(() => {
    const pinned = categories.filter((c) => c.pin === true);
    const others = categories.filter((c) => c.pin !== true);
    return [...pinned, ...others];
  }, [categories]);

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
  const dateFilterSummary = useMemo(() => {
    if (!hasActiveDateFilter) return t('expenses.noFilter');
    return `${fromDate || '---'} → ${endDate || '---'}`;
  }, [endDate, fromDate, hasActiveDateFilter]);

  const totalLabelText = useMemo(() => {
    const duration = buildDurationLabel(fromDate, endDate);
    return duration ? `${t('expenses.totalLabel')} (${duration}):` : `${t('expenses.totalLabel')}:`;
  }, [endDate, fromDate, t]);

  // Kategoriya boshqaruvi (yaratish/tahrirlash/o'chirish/pin) faqat OWNER (yoki shaxsiy hisob) uchun.
  const allowCategoryManage = canManageCategories(workspace.activeBusinessRole);

  return (
    <View style={styles.container}>
      <View style={styles.fixedHeader}>
        <WorkspaceSwitcher />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('expenses.dailyTitle')}</Text>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.totalIcon}>
            <Ionicons name="wallet-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.totalTextWrap}>
            <Text style={styles.totalInlineLabel} numberOfLines={1}>{totalLabelText}</Text>
            <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(totalExpenseAmount)}</Text>
          </View>
          <TouchableOpacity
            style={styles.totalMenuBtn}
            onPress={() => setQuickFilterVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('expenses.chooseFilter')}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterCard}>
          <TouchableOpacity style={styles.filterTitleRow} onPress={() => setFilterPanelOpen((prev) => !prev)}>
            <View style={styles.filterTitleGroup}>
              <Text numberOfLines={1} style={styles.filterInlineText}>
                <Text style={styles.filterTitle}>{t('expenses.dateRange')}</Text>
                <Text style={styles.filterTitle}>: </Text>
                <Text style={[styles.filterSummaryText, hasActiveDateFilter ? styles.filterSummaryActive : null]}>
                  {dateFilterSummary}
                </Text>
              </Text>
            </View>
            <Ionicons
              name={filterPanelOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {filterPanelOpen ? (
            <>
              {Platform.OS === 'web' ? (
                <View style={styles.segmentedWrapper}>
                  <View style={styles.segmentGroup}>
                    <Text style={styles.segmentLabel}>{t('expenses.start')}</Text>
                    <View style={styles.segmentRow}>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(fromDate).year}
                        onChange={(e: any) => setFromDate(updateDatePart(fromDate, 'year', e.target.value))}
                      >
                        <option value="">{t('expenses.year')}</option>
                        {yearOptions.map((year) => (
                          <option key={`from-year-${year}`} value={year}>{year}</option>
                        ))}
                      </select>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(fromDate).month}
                        onChange={(e: any) => setFromDate(updateDatePart(fromDate, 'month', e.target.value))}
                      >
                        <option value="">{t('expenses.month')}</option>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((month) => (
                          <option key={`from-month-${month}`} value={month}>{month}</option>
                        ))}
                      </select>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(fromDate).day}
                        onChange={(e: any) => setFromDate(updateDatePart(fromDate, 'day', e.target.value))}
                      >
                        <option value="">{t('expenses.day')}</option>
                        {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((day) => (
                          <option key={`from-day-${day}`} value={day}>{day}</option>
                        ))}
                      </select>
                    </View>
                  </View>

                  <View style={styles.segmentGroup}>
                    <Text style={styles.segmentLabel}>{t('expenses.end')}</Text>
                    <View style={styles.segmentRow}>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(endDate).year}
                        onChange={(e: any) => setEndDate(updateDatePart(endDate, 'year', e.target.value))}
                      >
                        <option value="">{t('expenses.year')}</option>
                        {yearOptions.map((year) => (
                          <option key={`end-year-${year}`} value={year}>{year}</option>
                        ))}
                      </select>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(endDate).month}
                        onChange={(e: any) => setEndDate(updateDatePart(endDate, 'month', e.target.value))}
                      >
                        <option value="">{t('expenses.month')}</option>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((month) => (
                          <option key={`end-month-${month}`} value={month}>{month}</option>
                        ))}
                      </select>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(endDate).day}
                        onChange={(e: any) => setEndDate(updateDatePart(endDate, 'day', e.target.value))}
                      >
                        <option value="">{t('expenses.day')}</option>
                        {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((day) => (
                          <option key={`end-day-${day}`} value={day}>{day}</option>
                        ))}
                      </select>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.mobileDateRange}>
                  <View style={styles.mobileDateInput}>
                    <AppTextInput
                      label={t('expenses.startDate')}
                      value={fromDate}
                      onChangeText={(value) => setFromDate(formatDateInputValue(value))}
                      placeholder="YYYY-MM-DD"
                      keyboardType="numeric"
                      containerStyle={styles.filterInput}
                    />
                    <TouchableOpacity style={styles.calendarBtn} onPress={() => setShowFromPicker(true)}>
                      <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.mobileDateInput}>
                    <AppTextInput
                      label={t('expenses.endDate')}
                      value={endDate}
                      onChangeText={(value) => setEndDate(formatDateInputValue(value))}
                      placeholder="YYYY-MM-DD"
                      keyboardType="numeric"
                      containerStyle={styles.filterInput}
                    />
                    <TouchableOpacity style={styles.calendarBtn} onPress={() => setShowEndPicker(true)}>
                      <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {showFromPicker && DateTimePicker ? (
                <DateTimePicker
                  value={getPickerDate(fromDate)}
                  mode="date"
                  display="default"
                  onChange={(_event: any, date: Date | undefined) => {
                    if (Platform.OS !== 'ios') setShowFromPicker(false);
                    if (date) setFromDate(formatDateFromDate(date));
                  }}
                />
              ) : null}
              {showEndPicker && DateTimePicker ? (
                <DateTimePicker
                  value={getPickerDate(endDate)}
                  mode="date"
                  display="default"
                  onChange={(_event: any, date: Date | undefined) => {
                    if (Platform.OS !== 'ios') setShowEndPicker(false);
                    if (date) setEndDate(formatDateFromDate(date));
                  }}
                />
              ) : null}

              <View style={styles.filterActionRow}>
                <PrimaryButton title={t('expenses.applyFilter')} onPress={handleApplyFilter} style={styles.filterButton} />
              </View>

              {filterError ? (
                <View style={styles.filterErrorRow}>
                  <Text style={styles.filterErrorText}>{filterError}</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {error ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{t('expenses.categories')}</Text>

        <View style={styles.listCard}>
          {loading ? (
            <SkeletonCardList count={5} containerStyle={styles.listSkeleton} />
          ) : sortedCategories.length === 0 ? (
            <Text style={styles.emptyText}>{t('expenses.noCategories')}</Text>
          ) : (
            sortedCategories.map((item, index) => (
              <View
                key={item.id}
                style={[styles.categoryRow, index !== sortedCategories.length - 1 && styles.categoryRowBorder]}
              >
                <TouchableOpacity style={styles.rowMain} onPress={() => handleOpenCategory(item)} activeOpacity={0.7}>
                  <View style={[styles.catAvatar, { backgroundColor: pickAvatarColor(item.name || item.id).bg }]}>
                    <Text style={[styles.catAvatarText, { color: pickAvatarColor(item.name || item.id).fg }]}>
                      {getInitials(item.name)}
                    </Text>
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.sumText}>{formatMoney(categorySums[item.id] ?? 0)}</Text>
                  </View>
                  {item.pin ? <Ionicons name="bookmark" size={14} color={colors.primary} /> : null}
                </TouchableOpacity>
                {allowCategoryManage ? (
                  expandedCategoryActionsId === item.id ? (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => {
                        setExpandedCategoryActionsId(null);
                        handleTogglePinCategory(item);
                      }}
                      disabled={pinningCategoryId === item.id}
                    >
                      {pinningCategoryId === item.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Ionicons
                          name={item.pin ? 'bookmark' : 'bookmark-outline'}
                          size={17}
                          color={item.pin ? colors.primary : colors.textSecondary}
                        />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => {
                        setExpandedCategoryActionsId(null);
                        openEditCategory(item);
                      }}
                    >
                      <Ionicons name="create-outline" size={17} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => {
                        setExpandedCategoryActionsId(null);
                        requestDeleteCategory(item);
                      }}
                      disabled={deletingCategory === item.id}
                    >
                      {deletingCategory === item.id ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Ionicons name="trash-outline" size={17} color={colors.danger} />
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.ellipsisBtn}
                    onPress={() =>
                      setExpandedCategoryActionsId((prev) => (prev === item.id ? null : item.id))
                    }
                  >
                    <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {allowCategoryManage ? (
        <TouchableOpacity style={styles.fab} onPress={openCreateCategory} activeOpacity={0.85}>
          <Ionicons name="add" size={30} color={colors.textOnPrimary} />
        </TouchableOpacity>
      ) : null}

      <Modal visible={categoryModalVisible} animationType="slide" transparent onRequestClose={closeCategoryModal}>
        <KeyboardAvoidingView
          style={styles.addModalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {categoryMode === 'create' ? t('expenses.addCategory') : t('expenses.editCategory')}
            </Text>
            <AppTextInput
              label={t('expenses.categoryName')}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder={t('expenses.categoryPlaceholder')}
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title={t('common.cancel')}
                variant="secondary"
                onPress={closeCategoryModal}
                style={styles.modalActionBtn}
              />
              <PrimaryButton
                title={categoryMode === 'create' ? t('common.add') : t('common.save')}
                onPress={handleSaveCategory}
                loading={savingCategory}
                style={styles.modalActionBtn}
              />
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={deleteConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={cancelDeleteCategory}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('expenses.deleteCategory')}</Text>
            <Text style={styles.deleteConfirmText}>
              {t('expenses.deleteConfirm', { name: pendingDeleteCategory?.name || t('expenses.thisCategory') })}
            </Text>
            <View style={styles.modalActions}>
              <PrimaryButton
                title={t('common.cancel')}
                variant="secondary"
                onPress={cancelDeleteCategory}
                style={styles.modalActionBtn}
              />
              <PrimaryButton
                title={t('common.delete')}
                onPress={confirmDeleteCategory}
                loading={Boolean(pendingDeleteCategory && deletingCategory === pendingDeleteCategory.id)}
                style={[styles.modalActionBtn, styles.deleteConfirmBtn]}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={quickFilterVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setQuickFilterVisible(false)}
      >
        <TouchableOpacity style={styles.quickFilterBackdrop} onPress={() => setQuickFilterVisible(false)} activeOpacity={1}>
          <View style={styles.quickFilterCard}>
            <Text style={styles.quickFilterTitle}>{t('expenses.chooseFilter')}</Text>
            <TouchableOpacity style={styles.quickFilterItem} onPress={() => handleQuickFilterSelect('today')}>
              <Text style={styles.quickFilterItemText}>{t('expenses.today')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterItem} onPress={() => handleQuickFilterSelect('currentWeek')}>
              <Text style={styles.quickFilterItemText}>{t('expenses.thisWeek')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterItem} onPress={() => handleQuickFilterSelect('currentMonth')}>
              <Text style={styles.quickFilterItemText}>{t('expenses.thisMonth')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterItem} onPress={() => handleQuickFilterSelect('customRange')}>
              <Text style={styles.quickFilterItemText}>{t('expenses.byDate')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.textPrimary,
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
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  totalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  totalTextWrap: {
    flex: 1,
  },
  totalInlineLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  totalMenuBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: colors.primary,
  },
  filterCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitleGroup: {
    flex: 1,
    paddingRight: 8,
  },
  filterInlineText: {
    fontSize: 14,
  },
  filterSummaryText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterSummaryActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  segmentedWrapper: {
    marginTop: 12,
    gap: 10,
  },
  segmentGroup: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.surfaceMuted,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentSelect: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mobileDateRange: {
    marginTop: 12,
    gap: 10,
  },
  mobileDateInput: {
    position: 'relative',
  },
  filterInput: {
    marginBottom: 0,
  },
  calendarBtn: {
    position: 'absolute',
    right: 8,
    top: 34,
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  filterActionRow: {
    marginTop: 12,
  },
  filterButton: {
    minHeight: 48,
  },
  filterErrorRow: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
    borderRadius: 10,
  },
  filterErrorText: {
    color: colors.danger,
    fontSize: 12,
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
    color: colors.danger,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catAvatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  catInfo: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sumText: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  ellipsisBtn: {
    width: 30,
    height: 30,
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
  // Kategoriya qo'shish oynasi yuqoriroqda ochilsin — klaviatura to'smasligi uchun.
  addModalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
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
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalActionBtn: {
    flex: 1,
  },
  deleteConfirmText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 20,
  },
  deleteConfirmBtn: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    borderWidth: 0,
  },
  quickFilterBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  quickFilterCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  quickFilterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickFilterItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickFilterItemText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});

function formatDateInputValue(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function formatDateFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultMonthRange(): { fromDate: string; endDate: string } {
  const now = new Date();
  return {
    fromDate: formatDateFromDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: formatDateFromDate(now),
  };
}

function getCurrentWeekRange(today: Date): { fromDate: string; endDate: string } {
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = weekStart.getDay();
  const deltaToMonday = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - deltaToMonday);
  return {
    fromDate: formatDateFromDate(weekStart),
    endDate: formatDateFromDate(today),
  };
}

function parseInputDate(value: string): Date | null {
  if (!isValidDateInput(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addMonthsSafe(date: Date, months: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth() + months;
  const d = date.getDate();
  const first = new Date(y, m, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d, lastDay));
}

function diffYmd(from: Date, to: Date): { years: number; months: number; days: number } {
  if (to < from) return { years: 0, months: 0, days: 0 };

  let years = 0;
  let months = 0;
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  while (true) {
    const next = addMonthsSafe(cursor, 12);
    if (next <= to) {
      years += 1;
      cursor = next;
    } else {
      break;
    }
  }

  while (true) {
    const next = addMonthsSafe(cursor, 1);
    if (next <= to) {
      months += 1;
      cursor = next;
    } else {
      break;
    }
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((to.getTime() - cursor.getTime()) / dayMs);
  return { years, months, days };
}

function buildDurationLabel(fromDate: string, endDate: string): string {
  const from = parseInputDate(fromDate);
  const to = parseInputDate(endDate);
  if (!from || !to || to < from) return '';

  const { years, months, days } = diffYmd(from, to);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yil`);
  if (months > 0) parts.push(`${months} oy`);
  if (days > 0) parts.push(`${days} kun`);
  if (parts.length === 0) return '0 kunlik';
  return `${parts.join(' ')}lik`;
}

function getPickerDate(value: string): Date {
  if (isValidDateInput(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function splitDateParts(value: string): { year: string; month: string; day: string } {
  if (!value) return { year: '', month: '', day: '' };
  const [year = '', month = '', day = ''] = value.split('-');
  return { year, month, day };
}

function updateDatePart(
  value: string,
  part: 'year' | 'month' | 'day',
  next: string
): string {
  const current = splitDateParts(value);
  const updated = {
    year: part === 'year' ? next : current.year,
    month: part === 'month' ? next : current.month,
    day: part === 'day' ? next : current.day,
  };

  if (!updated.year && !updated.month && !updated.day) return '';
  return `${updated.year}-${updated.month}-${updated.day}`;
}

function toAmount(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export default ExpensesScreen;
