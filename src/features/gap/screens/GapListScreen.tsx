import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  type ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import EmptyState from '../../../shared/ui/EmptyState';
import EntranceView from '../../../shared/ui/EntranceView';
import SectionHeader from '../../../shared/ui/SectionHeader';
import ScreenTopBar from '../../../app/components/ScreenTopBar';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import { ROUTES } from '../../../app/navigation/routes';
import type { GapNavigation } from '../../../app/navigation/types';
import { useGapSummary, useGapUnits, useMyGaps } from '../hooks/useGap';
import GapSummaryCard from '../components/GapSummaryCard';
import GapRow from '../components/GapRow';
import GapCreateModal from '../components/GapCreateModal';
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
  const [expanded, setExpanded] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);

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
      <GapRow
        item={item}
        isLast={index === items.length - 1}
        expanded={expanded}
        onPress={openDetail}
      />
    ),
    [openDetail, items.length, expanded]
  );

  const keyExtractor = useCallback((item: GapResponseDTO) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Dekorativ fon — barcha bosh ekranlarda bir xil "imzo" qatlami. */}
      <AmbientBackground />

      <EntranceView style={styles.header} duration={300} fromY={12}>
        {/* Ish maydoni almashtirgichi barcha bosh ekranlarda bir xil joyda va
            bir xil ko'rinishda turadi — chetdan chetga, sarlavhadan yuqorida. */}
        <ScreenTopBar />
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {t('gap.title')}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {t('gap.subtitle')}
            </Text>
          </View>
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
          expanded={expanded}
          onToggleExpand={() => setExpanded((prev) => !prev)}
        />

        <View style={styles.sectionWrap}>
          <SectionHeader icon="people" iconBadge={false} title={t('gap.section')} />
        </View>
      </EntranceView>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listCard}
        data={items}
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
          // Skeleton faqat BIRINCHI yuklashda: mavjud ro'yxat fon
          // yangilanishida kulrang chiziqlarga almashmaydi.
          isBusy ? (
            <SkeletonContactList count={4} />
          ) : (
            <EmptyState
              icon="people-outline"
              title={t('gap.empty')}
              description={t('gap.emptyHint')}
            />
          )
        }
      />

      {/* Yangi gap to'yona. Tugma barcha ekranlar bilan bitta komponentdan. */}
      <FloatingActionButton
        onPress={() => setCreateVisible(true)}
        accessibilityLabel={t('gap.createTitle')}
        pulse={!isBusy && items.length === 0}
      />

      <GapCreateModal visible={createVisible} onClose={() => setCreateVisible(false)} />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // Fon AmbientBackground'dan keladi — tekis rang berilmaydi.
      backgroundColor: 'transparent',
    },
    header: {
      backgroundColor: 'transparent',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xxs,
    },
    titleWrap: {
      flexShrink: 1,
      minWidth: 0,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.bodySmall,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textSecondary,
      marginTop: 1,
    },
    sectionWrap: {
      marginTop: spacing.sm,
    },
    list: {
      flex: 1,
    },
    // Ro'yxat tugagach karta ham tugaydi, ostida fon ko'rinadi va "+" tugmasi
    // o'sha bo'sh joyda suzadi. Bo'shliq karta TASHQARISIDA (margin) —
    // ichkarida (padding) berilsa oq karta ekran ostigacha cho'zilib,
    // tugma uni bosib turardi.
    listCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      marginHorizontal: spacing.md,
      marginBottom: 88,
      overflow: 'hidden',
      ...shadows.card,
    },
  });

export default GapListScreen;
