import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItem, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { NestedGlass, useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import BackButton from '../../../shared/ui/BackButton';
import ChipSelector, { type ChipOption } from '../../../shared/ui/ChipSelector';
import EmptyState from '../../../shared/ui/EmptyState';
import EntranceView from '../../../shared/ui/EntranceView';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import SearchField from '../../../shared/ui/SearchField';
import StatusBanner from '../../../shared/ui/StatusBanner';
import { FAB_CLEARANCE } from '../../../shared/ui/fabLayout';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import type { DebtsNavigation } from '../../../app/navigation/types';
import RentalRow from '../components/RentalRow';
import RentalSummaryCard from '../components/RentalSummaryCard';
import RentalFormModal from '../components/RentalFormModal';
import RentalDetailModal from '../components/RentalDetailModal';
import { useMyRentals, useRentalSummary } from '../hooks/useRentals';
import { rentalStatus } from '../model/rentalMath';
import type { RentalResponseDTO, RentalStatus } from '../types/rental';

/** Ro'yxat filtri. 'ALL' — odatiy: hammasi ko'rinadi. */
type StatusFilter = RentalStatus | 'ALL';

/** Qidiruv shu uzunlikdan boshlab serverga yuboriladi. */
const SEARCH_MIN = 2;

/**
 * Ijara bo'limining bosh ekrani.
 *
 * Qarzlar stack'i ichida turadi (alohida tab EMAS): ijara haqi mijozning
 * qarzi bo'lib turadi, ya'ni bu qarz daftarining bir ko'rinishi. Pastdagi
 * panelda doim to'rtta tab bor va beshinchisi o'rtadagi ovoz tugmasining
 * simmetriyasini buzardi.
 *
 * Karta QATORLARDAN yig'iladi (`rowSlice`): shunda ro'yxat tugagan joyda
 * karta ham tugaydi va "+" tugmasi fon ustida suzadi — gap kassa va
 * xarajatlar bo'limi ham shunday qurilgan.
 */
const RentalListScreen: React.FC<{ navigation: DebtsNavigation }> = ({ navigation }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<RentalResponseDTO | null>(null);
  const [opened, setOpened] = useState<RentalResponseDTO | null>(null);

  const filter = useMemo(
    () => ({
      ...(status === 'ALL' ? {} : { status }),
      ...(search.trim().length >= SEARCH_MIN ? { search: search.trim() } : {}),
    }),
    [status, search],
  );

  const listQuery = useMyRentals(filter);
  // Panel qidiruvga BOG'LANMAYDI: yuqoridagi umumiy raqamlar qidiruv
  // natijasiga qarab o'zgarib tursa, ular umumiy holatni ko'rsatmay qoladi.
  const summaryQuery = useRentalSummary(status === 'ALL' ? {} : { status });

  const statusOptions = useMemo<ChipOption<StatusFilter>[]>(
    () => [
      { value: 'ALL', label: t('rentals.filterAll') },
      { value: 'ACTIVE', label: t('rentals.filterActive') },
      { value: 'OVERDUE', label: t('rentals.filterOverdue') },
      { value: 'RETURNED', label: t('rentals.filterReturned') },
    ],
    [t],
  );

  /**
   * Kechikkanlar yuqorida, keyin muddati yaqinlari.
   *
   * Tartib SERVERGA tashlab qo'yilmaydi: holat sanalardan hisoblanadi va
   * "bugun" telefonning kuni — server kechagi tartibni yuborishi mumkin.
   */
  const items = useMemo(() => {
    const list = listQuery.data?.content ?? [];
    const weight = (item: RentalResponseDTO) => {
      const value = rentalStatus(item);
      if (value === 'OVERDUE') return 0;
      if (value === 'ACTIVE') return 1;
      return 2;
    };
    return [...list].sort((a, b) => weight(a) - weight(b) || a.dueDate.localeCompare(b.dueDate));
  }, [listQuery.data]);

  const handleOpenCreate = useCallback(() => {
    setEditing(null);
    setFormVisible(true);
  }, []);

  /** Kartadan "tahrirlash" — karta yopiladi, forma o'sha yozuv bilan ochiladi. */
  const handleEdit = useCallback((rental: RentalResponseDTO) => {
    setOpened(null);
    setEditing(rental);
    setFormVisible(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormVisible(false);
    setEditing(null);
  }, []);

  const handleRefresh = useCallback(() => {
    listQuery.refetch();
    summaryQuery.refetch();
  }, [listQuery, summaryQuery]);

  const renderItem = useCallback<ListRenderItem<RentalResponseDTO>>(
    ({ item, index }) => {
      const isLast = index === items.length - 1;
      return (
        <View
          style={[styles.rowSlice, index === 0 && styles.rowFirst, isLast && styles.rowLast]}
        >
          <RentalRow item={item} isLast={isLast} onPress={setOpened} />
        </View>
      );
    },
    [items.length, styles],
  );

  const error = listQuery.error ? (listQuery.error as Error).message : '';

  return (
    <View style={styles.container}>
      {/* Dekorativ fon — barcha ekranlarda bir xil "imzo" qatlami. */}
      <AmbientBackground />

      <EntranceView style={styles.header} duration={300} fromY={12}>
        <View style={styles.titleRow}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {t('rentals.title')}
            </Text>
          </View>
        </View>

        <View style={styles.headerBody}>
          <RentalSummaryCard summary={summaryQuery.data} loading={summaryQuery.isLoading} />

          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder={t('rentals.searchPlaceholder')}
            accessibilityLabel={t('rentals.searchPlaceholder')}
          />

          <ChipSelector options={statusOptions} value={status} onChange={setStatus} />

          {error ? (
            <StatusBanner
              tone="error"
              message={error}
              actionLabel={t('common.retry')}
              onAction={handleRefresh}
            />
          ) : null}
        </View>
      </EntranceView>

      {listQuery.isLoading ? (
        <View style={styles.emptyCard}>
          <SkeletonContactList />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <EmptyState
            icon="cube-outline"
            title={t('rentals.emptyTitle')}
            description={t('rentals.emptyHint')}
            actionLabel={t('rentals.createSubmit')}
            actionIcon="add"
            onAction={handleOpenCreate}
          />
        </View>
      ) : (
        <NestedGlass>
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={listQuery.isRefetching}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          />
        </NestedGlass>
      )}

      <FloatingActionButton
        onPress={handleOpenCreate}
        accessibilityLabel={t('rentals.createSubmit')}
        pulse={items.length === 0}
      />

      <RentalFormModal visible={formVisible} onClose={handleCloseForm} rental={editing} />
      <RentalDetailModal rental={opened} onClose={() => setOpened(null)} onEdit={handleEdit} />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // Fon AmbientBackground'dan keladi — tekis rang berilmaydi.
      backgroundColor: 'transparent',
    },
    header: {
      backgroundColor: 'transparent',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xxs,
    },
    /**
     * Sarlavha O'Z SIRTIDA — fon rasmi qo'yilganda matn o'qilishi uchun
     * (gap kassadagi bilan bir xil yechim). Kenglik mazmunga qarab.
     */
    titleWrap: {
      alignSelf: 'flex-start',
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      ...glass.surface,
      flexShrink: 1,
      minWidth: 0,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    headerBody: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.sm,
    },
    emptyCard: {
      ...glass.pane,
      borderRadius: radius.xxl,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      overflow: 'hidden',
    },
    list: {
      flex: 1,
      marginTop: spacing.sm,
    },
    // Faqat pastki bo'shliq: "+" tugmasi oxirgi qatorni yopib qolmasin.
    // Margin emas, PADDING — RN `contentContainerStyle` dagi margin'ni
    // aylantiriladigan balandlikka qo'shmaydi.
    listContent: {
      paddingBottom: FAB_CLEARANCE,
    },
    rowSlice: {
      backgroundColor: glass.surface.backgroundColor,
      marginHorizontal: spacing.md,
    },
    rowFirst: {
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      overflow: 'hidden',
    },
    rowLast: {
      borderBottomLeftRadius: radius.xxl,
      borderBottomRightRadius: radius.xxl,
      overflow: 'hidden',
    },
  });

export default RentalListScreen;
