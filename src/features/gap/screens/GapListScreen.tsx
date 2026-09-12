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
import { FAB_CLEARANCE } from '../../../shared/ui/fabLayout';
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
      <View
        style={[
          styles.rowSlice,
          index === 0 && styles.rowFirst,
          index === items.length - 1 && styles.rowLast,
        ]}
      >
        <GapRow
          item={item}
          isLast={index === items.length - 1}
          expanded={expanded}
          onPress={openDetail}
        />
      </View>
    ),
    [openDetail, items.length, expanded, styles]
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
          <View style={styles.emptyCard}>
          {/* Skeleton faqat BIRINCHI yuklashda: mavjud ro'yxat fon
              yangilanishida kulrang chiziqlarga almashmaydi. */}
          {isBusy ? (
            <SkeletonContactList count={4} />
          ) : (
            <EmptyState
              icon="people-outline"
              title={t('gap.empty')}
              description={t('gap.emptyHint')}
            />
          )}
          </View>
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
    sectionWrap: {
      marginTop: spacing.sm,
    },
    list: {
      flex: 1,
    },
    // Ro'yxat tugagach karta ham tugaydi, ostida fon ko'rinadi va "+" tugmasi
    // o'sha bo'sh joyda suzadi.
    // Bo'shliq KARTA ICHIDA (padding), tashqarisida (margin) EMAS:
    // react-native `contentContainerStyle` dagi margin'ni aylantiriladigan
    // balandlikka QO'SHMAYDI — ro'yxat oxiriga yetilganda bo'shliq umuman
    // paydo bo'lmasdi va oxirgi qator "+" tugmasi ostida qolaverardi.
    // Padding esa kontent o'lchamiga kiradi, shuning uchun ishlaydi
    // (Xarajatlar bo'limi boshidan shunday qilingan).
    // Bo'sh holat va skeleton ilgari karta ICHIDA chizilardi. Karta endi
    // qatorlardan yig'ilgani uchun ular yalang'och fonda qolmasin — o'ziga
    // xos karta sirtini shu yerda beramiz.
    emptyCard: {
      ...glass.pane,
      borderRadius: radius.xxl,
      marginHorizontal: spacing.md,
      overflow: 'hidden',
    },
    // Ro'yxat kontenti: karta emas, faqat pastki bo'shliq.
    listCard: {
      paddingBottom: FAB_CLEARANCE,
    },
    // Karta qatorlarning o'zidan yig'iladi: birinchi qator tepasi, oxirgisi
    // pasti yumaloq. Shu sababli karta oxirgi qatorda TUGAYDI va ostidagi
    // bo'shliq undan tashqarida qoladi — "+" fon ustida suzadi.
    // Ilgari karta kontent konteyneri edi, bo'shliq uning ichiga tushib
    // karta ekran ostiga yopishib qolardi.
    rowSlice: {
      backgroundColor: colors.glassSurface,
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

export default GapListScreen;
