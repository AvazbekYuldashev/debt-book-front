import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import colors from '../styles/colors';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { CategoryResponseDTO } from '../types/category';
import { createCategory, deleteCategory, getCategories, pinCategory, updateCategory } from '../services/categoryService';
import { getExpenseSumByCategory } from '../services/expenseService';
import { ROUTES } from '../navigation/routes';
import { formatMoney } from '../utils/money';

const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;

const TOTAL_ACCENT = '#0D9488';
type CategoryMode = 'create' | 'edit';
type QuickFilterKey = 'today' | 'currentWeek' | 'currentMonth' | 'customRange';

const ExpensesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
      setError(e instanceof Error ? e.message : "Ma'lumotlarni yuklab bo'lmadi");
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
    setCategoryName(category.name);
    setCategoryModalVisible(true);
  };

  const closeCategoryModal = () => {
    setCategoryModalVisible(false);
    setCategoryName('');
    setEditingCategoryId('');
  };

  const handleSaveCategory = async () => {
    if (!profile?.jwt) {
      setError('Token topilmadi. Qayta login qiling');
      return;
    }
    if (!categoryName.trim()) {
      setError('Kategoriya nomini kiriting');
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
      setError(e instanceof Error ? e.message : "Saqlab bo'lmadi");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!profile?.jwt) {
      setError('Token topilmadi. Qayta login qiling');
      return;
    }
    setDeletingCategory(id);
    setError('');
    try {
      await deleteCategory(id, profile.jwt);
      await loadCategories(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "O'chirib bo'lmadi");
    } finally {
      setDeletingCategory('');
    }
  };

  const handleTogglePinCategory = async (category: CategoryResponseDTO) => {
    if (!profile?.jwt) {
      setError('Token topilmadi. Qayta login qiling');
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
      setError(e instanceof Error ? e.message : "Pin holatini o'zgartirib bo'lmadi");
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

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const aPinned = Boolean(a.pin);
        const bPinned = Boolean(b.pin);
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [categories]
  );

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
    if (!hasActiveDateFilter) return 'Filtr o‘rnatilmagan';
    return `${fromDate || '---'} → ${endDate || '---'}`;
  }, [endDate, fromDate, hasActiveDateFilter]);

  const totalLabelText = useMemo(() => {
    const duration = buildDurationLabel(fromDate, endDate);
    return duration ? `Jami ${duration} xarajat:` : 'Jami xarajat:';
  }, [endDate, fromDate]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <WorkspaceSwitcher />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Kunlik xarajatlar</Text>
          <TouchableOpacity style={styles.headerAction} onPress={openCreateCategory}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.headerActionText}>Kategoriya</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.totalHeaderRow}>
            <Text style={styles.totalInlineLabel}>{totalLabelText}</Text>
            <Text style={styles.totalValue}>{formatMoney(totalExpenseAmount)}</Text>
            <TouchableOpacity style={styles.totalMenuBtn} onPress={() => setQuickFilterVisible(true)}>
              <Ionicons name="ellipsis-horizontal" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterCard}>
          <TouchableOpacity style={styles.filterTitleRow} onPress={() => setFilterPanelOpen((prev) => !prev)}>
            <View style={styles.filterTitleGroup}>
              <Text numberOfLines={1} style={styles.filterInlineText}>
                <Text style={styles.filterTitle}>Sana oralig'i</Text>
                <Text style={styles.filterTitle}>: </Text>
                <Text style={[styles.filterSummaryText, hasActiveDateFilter ? styles.filterSummaryActive : null]}>
                  {dateFilterSummary}
                </Text>
              </Text>
            </View>
            <Ionicons
              name={filterPanelOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color="#6B7280"
            />
          </TouchableOpacity>

          {filterPanelOpen ? (
            <>
              {Platform.OS === 'web' ? (
                <View style={styles.segmentedWrapper}>
                  <View style={styles.segmentGroup}>
                    <Text style={styles.segmentLabel}>Boshlanish</Text>
                    <View style={styles.segmentRow}>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(fromDate).year}
                        onChange={(e: any) => setFromDate(updateDatePart(fromDate, 'year', e.target.value))}
                      >
                        <option value="">Yil</option>
                        {yearOptions.map((year) => (
                          <option key={`from-year-${year}`} value={year}>{year}</option>
                        ))}
                      </select>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(fromDate).month}
                        onChange={(e: any) => setFromDate(updateDatePart(fromDate, 'month', e.target.value))}
                      >
                        <option value="">Oy</option>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((month) => (
                          <option key={`from-month-${month}`} value={month}>{month}</option>
                        ))}
                      </select>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(fromDate).day}
                        onChange={(e: any) => setFromDate(updateDatePart(fromDate, 'day', e.target.value))}
                      >
                        <option value="">Kun</option>
                        {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((day) => (
                          <option key={`from-day-${day}`} value={day}>{day}</option>
                        ))}
                      </select>
                    </View>
                  </View>

                  <View style={styles.segmentGroup}>
                    <Text style={styles.segmentLabel}>Tugash</Text>
                    <View style={styles.segmentRow}>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(endDate).year}
                        onChange={(e: any) => setEndDate(updateDatePart(endDate, 'year', e.target.value))}
                      >
                        <option value="">Yil</option>
                        {yearOptions.map((year) => (
                          <option key={`end-year-${year}`} value={year}>{year}</option>
                        ))}
                      </select>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(endDate).month}
                        onChange={(e: any) => setEndDate(updateDatePart(endDate, 'month', e.target.value))}
                      >
                        <option value="">Oy</option>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((month) => (
                          <option key={`end-month-${month}`} value={month}>{month}</option>
                        ))}
                      </select>
                      <select
                        style={styles.segmentSelect as any}
                        value={splitDateParts(endDate).day}
                        onChange={(e: any) => setEndDate(updateDatePart(endDate, 'day', e.target.value))}
                      >
                        <option value="">Kun</option>
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
                      label="Boshlanish sana"
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
                      label="Tugash sana"
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
                <PrimaryButton title="Filtrlash" onPress={handleApplyFilter} style={styles.filterButton} />
              </View>

              {filterError ? (
                <View style={styles.filterErrorRow}>
                  <Text style={styles.filterErrorText}>{filterError}</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Kategoriyalar</Text>

        <View style={styles.listCard}>
          {loading ? (
            <SkeletonCardList count={5} containerStyle={styles.listSkeleton} />
          ) : sortedCategories.length === 0 ? (
            <Text style={styles.emptyText}>Kategoriya topilmadi</Text>
          ) : (
            sortedCategories.map((item, index) => (
              <View
                key={item.id}
                style={[styles.categoryRow, index !== sortedCategories.length - 1 && styles.categoryRowBorder]}
              >
                <TouchableOpacity style={styles.rowMain} onPress={() => handleOpenCategory(item)}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.sumText}>{formatMoney(categorySums[item.id] ?? 0)}</Text>
                </TouchableOpacity>
                {expandedCategoryActionsId === item.id ? (
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
                    <Ionicons name="ellipsis-horizontal" size={16} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={categoryModalVisible} animationType="slide" transparent onRequestClose={closeCategoryModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {categoryMode === 'create' ? "Kategoriya qo'shish" : 'Kategoriyani tahrirlash'}
            </Text>
            <AppTextInput
              label="Kategoriya nomi"
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Masalan: Ovqat"
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Bekor qilish"
                variant="secondary"
                onPress={closeCategoryModal}
                style={styles.modalActionBtn}
              />
              <PrimaryButton
                title={categoryMode === 'create' ? "Qo'shish" : 'Saqlash'}
                onPress={handleSaveCategory}
                loading={savingCategory}
                style={styles.modalActionBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={cancelDeleteCategory}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Kategoriyani o‘chirish</Text>
            <Text style={styles.deleteConfirmText}>
              {`"${pendingDeleteCategory?.name || 'Ushbu kategoriya'}" ni rostdan ham o‘chirmoqchimisiz?`}
            </Text>
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Bekor qilish"
                variant="secondary"
                onPress={cancelDeleteCategory}
                style={styles.modalActionBtn}
              />
              <PrimaryButton
                title="O‘chirish"
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
            <Text style={styles.quickFilterTitle}>Filter tanlang</Text>
            <TouchableOpacity style={styles.quickFilterItem} onPress={() => handleQuickFilterSelect('today')}>
              <Text style={styles.quickFilterItemText}>Bugun</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterItem} onPress={() => handleQuickFilterSelect('currentWeek')}>
              <Text style={styles.quickFilterItemText}>Joriy hafta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterItem} onPress={() => handleQuickFilterSelect('currentMonth')}>
              <Text style={styles.quickFilterItemText}>Joriy oy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterItem} onPress={() => handleQuickFilterSelect('customRange')}>
              <Text style={styles.quickFilterItemText}>Sana bo'yicha</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  totalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  totalInlineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  totalMenuBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: TOTAL_ACCENT,
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
    color: '#9CA3AF',
  },
  filterSummaryActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  segmentedWrapper: {
    marginTop: 12,
    gap: 10,
  },
  segmentGroup: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentSelect: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#111827',
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
    backgroundColor: '#F3F4F6',
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
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  filterErrorText: {
    color: colors.danger,
    fontSize: 12,
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
    color: colors.danger,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  categoryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowMain: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sumText: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
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
    backgroundColor: '#F9FAFB',
  },
  ellipsisBtn: {
    width: 30,
    height: 30,
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
    color: '#374151',
    marginBottom: 14,
    lineHeight: 20,
  },
  deleteConfirmBtn: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
    borderWidth: 0,
  },
  quickFilterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  quickFilterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  quickFilterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickFilterItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickFilterItemText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
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
      return { ok: false as const, error: "Tugash sana boshlanish sanasidan oldin bo'lishi mumkin emas." };
    }
  }
  return {
    ok: true as const,
    fromDate: normalizedFrom || undefined,
    endDate: normalizedEnd || undefined,
  };
}

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

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
