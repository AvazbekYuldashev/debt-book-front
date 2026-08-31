import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  type ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import WorkspaceSwitcher from '../../business/components/WorkspaceSwitcher';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import { ROUTES } from '../../../app/navigation/routes';
import type { GapNavigation } from '../../../app/navigation/types';
import { useGapSummary, useGapUnits, useMyGaps } from '../hooks/useGap';
import GapSummaryCard from '../components/GapSummaryCard';
import GapRow from '../components/GapRow';
import {
  GapResponseDTO,
  GapSort,
  GapSortDirection,
  GapUnitFilter,
  toAmount,
} from '../types/gap';

/**
 * Gap kassa bosh ekrani.
 *
 * Odatiy holat — 'ALL': foydalanuvchi obuna bo'lgan BARCHA gap kassalar
 * ko'rinadi, statistika esa har valyutani alohida qator qilib chiqaradi.
 * Valyuta tanlansa ikkalasi ham o'sha valyutaga qisqaradi.
 */
const GapListScreen: React.FC<{ navigation: GapNavigation }> = ({ navigation }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [unitCode, setUnitCode] = useState<GapUnitFilter>('ALL');
  const [sort, setSort] = useState<GapSort | null>(null);

  const unitsQuery = useGapUnits();
  const summaryQuery = useGapSummary(unitCode);
  const listQuery = useMyGaps(unitCode);

  const isBusy = listQuery.isLoading;

  /**
   * Statistikadagi raqamga bosilsa, ro'yxat o'sha ko'rsatkich bo'yicha
   * eng kattadan saralanadi — Qarzlar ekranidagi bilan bir xil xatti-harakat.
   * Saralash yo'q bo'lsa odatiy tartib (yangi guruh birinchi) saqlanadi.
   */
  const items = useMemo(() => {
    const list = listQuery.data?.content ?? [];
    if (!sort) return list;
    // Bosilgan raqam bitta birlikka tegishli — solishtirish ham faqat
    // o'sha birlik bo'yicha. So'm bilan dollarni taqqoslab bo'lmaydi.
    const value = (item: GapResponseDTO) => {
      const source = sort.direction === 'received' ? item.myTotalReceived : item.myTotalGiven;
      const match = (source ?? []).find((entry) => entry.unitCode === sort.unitCode);
      return match ? toAmount(match.amount) : 0;
    };
    return [...list].sort((a, b) => value(b) - value(a));
  }, [listQuery.data, sort]);

  /** Bir xil raqam qayta bosilsa saralash bekor bo'ladi. */
  const handleAmountPress = useCallback(
    (direction: GapSortDirection, unit: string) => {
      setSort((prev) =>
        prev && prev.direction === direction && prev.unitCode === unit
          ? null
          : { direction, unitCode: unit }
      );
      // Bosilgan raqam bitta birlikka tegishli — ro'yxat ham o'shanga qisqaradi.
      setUnitCode(unit);
    },
    []
  );

  const handleRefresh = useCallback(() => {
    summaryQuery.refetch();
    listQuery.refetch();
  }, [summaryQuery, listQuery]);

  const openDetail = useCallback(
    (item: GapResponseDTO) => {
      navigation.navigate(ROUTES.GAP_DETAIL, {
        id: item.id,
        name: item.name,
        unitCode: item.unitCode,
        unitLabel: item.unitLabel,
        unitType: item.unitType,
        organizer: item.organizer,
      });
    },
    [navigation]
  );

  const renderItem: ListRenderItem<GapResponseDTO> = useCallback(
    ({ item, index }) => (
      <GapRow item={item} isLast={index === items.length - 1} onPress={openDetail} />
    ),
    [openDetail, items.length]
  );

  const keyExtractor = useCallback((item: GapResponseDTO) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Ish maydoni almashtirgichi barcha bosh ekranlarda bir xil joyda va
            bir xil ko'rinishda turadi — chetdan chetga, sarlavhadan yuqorida. */}
        <WorkspaceSwitcher />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('gap.title')}</Text>
        </View>
        <GapSummaryCard
          summary={summaryQuery.data}
          units={unitsQuery.data ?? []}
          unitCode={unitCode}
          onUnitChange={(next) => {
            setUnitCode(next);
            setSort(null);
          }}
          sort={sort}
          onAmountPress={handleAmountPress}
          loading={summaryQuery.isLoading}
        />
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listCard}
        data={isBusy ? [] : items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={11}
        refreshControl={
          <RefreshControl
            refreshing={listQuery.isFetching && !isBusy}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          isBusy ? (
            <SkeletonCardList count={4} containerStyle={styles.listSkeleton} />
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={26} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyText}>{t('gap.empty')}</Text>
            </View>
          )
        }
      />

      {/* Yangi gap kassa. Tugma barcha ekranlar bilan bitta komponentdan. */}
      <FloatingActionButton
        onPress={() => navigation.navigate(ROUTES.GAP_CREATE)}
        accessibilityLabel={t('gap.createTitle')}
        pulse={!isBusy && items.length === 0}
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
    list: {
      flex: 1,
    },
    listCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      marginHorizontal: spacing.md,
      // Pastdan bo'shliq: aks holda "+" tugmasi oxirgi qatorning summasini
      // yopib turadi (tugma ro'yxat USTIDA suzadi).
      marginBottom: 96,
      overflow: 'hidden',
    },
    listSkeleton: {
      padding: spacing.md,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });

export default GapListScreen;
