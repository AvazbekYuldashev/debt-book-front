import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FlatList, type ListRenderItem, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { NestedGlass, useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import ScreenTopBar from '../../../app/components/ScreenTopBar';
import ChipSelector, { type ChipOption } from '../../../shared/ui/ChipSelector';
import EmptyState from '../../../shared/ui/EmptyState';
import EntranceView from '../../../shared/ui/EntranceView';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import SearchField from '../../../shared/ui/SearchField';
import StatusBanner from '../../../shared/ui/StatusBanner';
import { FAB_CLEARANCE } from '../../../shared/ui/fabLayout';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import { canDelete, canWrite } from '../../../shared/lib/permissions';
import { AuthContext } from '../../auth/context/AuthContext';
import { WorkspaceContext } from '../../business/context/WorkspaceContext';
import type { RentalsScreenProps } from '../../../app/navigation/types';
import type { ROUTES } from '../../../app/navigation/routes';
import RentalRow from '../components/RentalRow';
import RentalItemRow from '../components/RentalItemRow';
import RentalSummaryCard from '../components/RentalSummaryCard';
import RentalFormModal from '../components/RentalFormModal';
import RentalDetailModal from '../components/RentalDetailModal';
import RentalItemFormModal from '../components/RentalItemFormModal';
import RentalItemDetailModal from '../components/RentalItemDetailModal';
import { useMyRentals, useRentalItems, useRentalSummary } from '../hooks/useRentals';
import { rentalStage } from '../model/rentalMath';
import { groupRentalItems } from '../model/rentalStock';
import ProductCategoryBar from '../../products/components/ProductCategoryBar';
import {
  createCategory,
  deleteCategory,
  getCategories,
} from '../../expenses/services/categoryService';
import type { CategoryResponseDTO } from '../../expenses/types/category';
import { confirmAction } from '../../../shared/lib/confirm';
import { parseCurrencyAmounts } from '../../../shared/lib/currency';
import { formatQuantity } from '../../../shared/lib/quantity';
import type { RentalFilterStatus, RentalResponseDTO, RentalStage } from '../types/rental';
import type { RentalItemResponseDTO } from '../types/rentalItem';

/** Ekranning ikki bo'limi: OMBOR (nima bor, nechtasi bo'sh) va berilgan IJARALAR. */
type Tab = 'stock' | 'rentals';

/**
 * Ijaralar filtri. ODATIYSI 'OUT' — mijozda turganlar.
 *
 * 'ALL' ("Hammasi") qaytgan ijaralarni ham qo'shadi, lekin u ODATIY
 * EMAS: kundalik savol "mijozda nima turibdi", qaytganlar esa ro'yxatni
 * to'ldirib, qidirishni qiyinlashtirardi. Ataylab tanlangani boshqa gap
 * — o'shanda odam butun tarixni ko'rmoqchi.
 *
 * 'DEBT' (nasiya) yo'q: bosqich sifatida u olib tashlangan (izohi
 * `rentalMath.rentalStage` da).
 */
type StatusFilter = 'ALL' | Extract<RentalFilterStatus, 'OUT' | 'OVERDUE' | 'CLOSED'>;

/** Qidiruv shu uzunlikdan boshlab serverga yuboriladi. */
const SEARCH_MIN = 2;

/** Filtr qaysi bosqichlarni o'z ichiga oladi — server eski bo'lsa ham ro'yxat to'g'ri chiqsin. */
const STAGES_OF: Record<StatusFilter, RentalStage[]> = {
  ALL: ['ACTIVE', 'OVERDUE', 'CLOSED'],
  OUT: ['ACTIVE', 'OVERDUE'],
  OVERDUE: ['OVERDUE'],
  CLOSED: ['CLOSED'],
};

/** Ro'yxat tartibi: kechikkan, mijozdagi, yopilgan. */
const STAGE_WEIGHT: Record<RentalStage, number> = { OVERDUE: 0, ACTIVE: 1, CLOSED: 2 };

/** Ombor ro'yxatidagi qator: guruh sarlavhasi yoki buyum. */
type StockEntry =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'item'; key: string; item: RentalItemResponseDTO; isLast: boolean };

/**
 * Ijara bo'limining bosh ekrani.
 *
 * Ijarachi (opalubka, lesa, arava, to'y jihozlari) uchun ikki savol bor:
 *
 *   OMBOR    — "nimam bor, nechtasi bo'sh, nechtasi kimda?"
 *              100 ta lesadan 50 tasi band, 50 tasi bo'sh.
 *   IJARALAR — "nima kimda va qancha haq yig'ildi?" Mijozdagilar,
 *              kechikkanlar va qaytganlar alohida filtrda.
 *
 * Yuqoridagi panel TANLANGAN ro'yxat haqida: nechta yozuv bor va
 * ular qancha haq yig'gan (izohi `RentalSummaryCard` da).
 *
 * Biznes hisobida ombor ham, ijaralar ham BIZNESNIKI: hamma adminlar
 * bir xil ro'yxatni ko'radi (X-Business-ID). MEMBER faqat ko'radi.
 *
 * Qarzlar stack'i ichida turadi (alohida tab EMAS): pastki panelda doim
 * to'rtta tab bor va beshinchisi o'rtadagi ovoz tugmasining
 * simmetriyasini buzardi.
 */
const RentalListScreen: React.FC<RentalsScreenProps<typeof ROUTES.RENTAL_LIST>> = ({
  navigation,
  route,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const allowWrite = canWrite(workspace.activeBusinessRole);
  const allowDelete = canDelete(workspace.activeBusinessRole);

  const [tab, setTab] = useState<Tab>(route?.params?.tab ?? 'stock');
  const [status, setStatus] = useState<StatusFilter>('OUT');
  const [search, setSearch] = useState('');

  // Ijara formasi va kartasi
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<RentalResponseDTO | null>(null);
  const [presetItem, setPresetItem] = useState<RentalItemResponseDTO | null>(null);
  const [opened, setOpened] = useState<RentalResponseDTO | null>(null);

  // Ombor formasi va kartasi
  const [itemFormVisible, setItemFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItemResponseDTO | null>(null);
  const [openedItem, setOpenedItem] = useState<RentalItemResponseDTO | null>(null);

  /**
   * Boshqa ekrandan "buyum qo'shish" so'rovi bilan kelinganda (mijoz
   * kartasidagi formada kerakli buyum yo'q edi) — ombor ochiladi va forma
   * darhol chiqadi. Parametr ishlatilgach tozalanadi: orqaga qaytib
   * kelganda forma yana ochilib qolmasin.
   */
  useEffect(() => {
    const params = route?.params;
    if (!params) return;
    if (params.tab) setTab(params.tab);
    if (params.addItem && allowWrite) {
      setEditingItem(null);
      setItemFormVisible(true);
    }
    if (params.tab || params.addItem) navigation.setParams({ tab: undefined, addItem: undefined });
  }, [route?.params, allowWrite, navigation]);

  const needle = search.trim();
  // 'ALL' da `status` YUBORILMAYDI: server uchun "filtrsiz" degani shu.
  const filter = useMemo(
    () => ({
      ...(status === 'ALL' ? {} : { status }),
      ...(needle.length >= SEARCH_MIN ? { search: needle } : {}),
    }),
    [status, needle],
  );

  const itemsQuery = useRentalItems();
  const listQuery = useMyRentals(filter);
  /*
   * Panel TANLANGAN FILTRGA ergashadi.
   *
   * Ilgari u filtrdan mustaqil edi ("umumiy holatni ko'rsatsin" degan
   * mulohaza bilan), lekin amalda ro'yxat bir narsani, tepadagi raqam
   * boshqa narsani aytardi: "Yopilgan" tanlanganda pastda qaytgan
   * ijaralar turar, tepada esa mijozdagilarning puli ko'rinardi.
   *
   * Qidiruv YUBORILMAYDI: u yozishga qarab o'zgaradi va panel har
   * harfda sakrab turardi.
   */
  const summaryQuery = useRentalSummary(
    useMemo(() => (status === 'ALL' ? {} : { status }), [status]),
  );

  const tabOptions = useMemo<ChipOption<Tab>[]>(
    () => [
      { value: 'stock', label: t('rentals.tabStock') },
      { value: 'rentals', label: t('rentals.tabRentals') },
    ],
    [t],
  );

  const statusOptions = useMemo<ChipOption<StatusFilter>[]>(
    () => [
      { value: 'ALL', label: t('rentals.filterAll') },
      { value: 'OUT', label: t('rentals.filterActive') },
      { value: 'OVERDUE', label: t('rentals.filterOverdue') },
      { value: 'CLOSED', label: t('rentals.filterClosed') },
    ],
    [t],
  );

  // Paneldagi sanoq ustuni TANLANGAN filtr bilan nomlanadi — izohi
  // `RentalSummaryCard` da.
  const countLabel = useMemo(
    () => statusOptions.find((option) => option.value === status)?.label ?? '',
    [statusOptions, status],
  );

  const accruedEntries = useMemo(
    () =>
      Object.entries(parseCurrencyAmounts(summaryQuery.data?.accruedByCurrency)).filter(
        ([, amount]) => (amount ?? 0) > 0,
      ) as [string, number][],
    [summaryQuery.data?.accruedByCurrency],
  );

  /**
   * Ijaralar: kechikkanlar yuqorida, keyin mijozdagilar, yopilgan.
   *
   * Tartib va filtr SERVERGA tashlab qo'yilmaydi: bosqich "hozir"ga
   * bog'liq va u telefonning soati — server kechagi holatni yuborishi
   * mumkin.
   */
  const rentals = useMemo(() => {
    const allowed = STAGES_OF[status];
    return (listQuery.data?.content ?? [])
      .map((item) => ({ item, stage: rentalStage(item) }))
      .filter(({ stage }) => allowed.includes(stage))
      .sort(
        (a, b) =>
          STAGE_WEIGHT[a.stage] - STAGE_WEIGHT[b.stage] || a.item.dueDate.localeCompare(b.item.dueDate),
      )
      .map(({ item }) => item);
  }, [listQuery.data, status]);

  const allItems = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  /**
   * Kategoriyalar narxnomadagi kabi BOSHQARILADI: alohida ro'yxat,
   * yaratiladi va o'chiriladi, buyum esa unga bog'lanadi. Erkin matn
   * bo'lganda "QURILISH" va "Qurilish" ikki guruhga bo'linib ketardi.
   */
  const [categories, setCategories] = useState<CategoryResponseDTO[]>([]);
  const [activeCategory, setActiveCategory] = useState('');

  const loadCategories = useCallback(async () => {
    if (!profile?.jwt) {
      setCategories([]);
      return;
    }
    try {
      const page = await getCategories({ page: 1, size: 100, type: 'RENTAL', token: profile.jwt });
      setCategories(page.content ?? []);
    } catch {
      // Kategoriyalar kelmasa ombor baribir ishlaydi — filtr chiqmaydi, xolos.
      setCategories([]);
    }
  }, [profile?.jwt]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const categoryChips = useMemo(
    () => categories.map((item) => ({ id: item.id, name: item.name })),
    [categories],
  );

  const handleCreateCategory = useCallback(
    async (name: string) => {
      if (!profile?.jwt) return false;
      try {
        const created = await createCategory({ name, type: 'RENTAL' }, profile.jwt);
        await loadCategories();
        // Yangi kategoriya darhol tanlanadi — odam uni endigina yaratdi,
        // ehtimol shunga buyum qo'shmoqchi.
        if (created?.id) setActiveCategory(created.id);
        return true;
      } catch {
        return false;
      }
    },
    [profile?.jwt, loadCategories],
  );

  const handleDeleteCategory = useCallback(
    (category: { id: string; name: string }) => {
      if (!profile?.jwt) return;
      confirmAction(t('rentals.deleteCategoryConfirm', { name: category.name }), async () => {
        try {
          await deleteCategory(category.id, profile.jwt);
          // Filtr o'chirilgan kategoriyada tursa "hammasi"ga qaytamiz,
          // aks holda ro'yxat bo'sh ko'rinib qolardi.
          setActiveCategory((current) => (current === category.id ? '' : current));
          await loadCategories();
          // Buyumlar ham qayta o'qiladi: kategoriya o'chgach ular
          // "kategoriyasiz" bo'lib qoladi.
          await itemsQuery.refetch();
        } catch {
          // Xato xabari serverdan keladi — bu yerda jim qolamiz.
        }
      });
    },
    [profile?.jwt, loadCategories, itemsQuery, t],
  );

  /** Ombor: qidiruv telefonda (ro'yxat to'liq yuklangan), guruhlarga bo'lingan. */
  const stockEntries = useMemo<StockEntry[]>(() => {
    const lower = needle.toLowerCase();
    const byCategory = activeCategory
      ? allItems.filter((item) => (item.categoryId ?? '') === activeCategory)
      : allItems;
    const matched = lower
      ? byCategory.filter(
          (item) =>
            item.name.toLowerCase().includes(lower) || (item.category ?? '').toLowerCase().includes(lower),
        )
      : byCategory;
    const groups = groupRentalItems(matched);
    // Bitta guruh bo'lsa (yoki hammasi guruhsiz) sarlavha ortiqcha.
    const withHeaders = groups.length > 1 || Boolean(groups[0]?.category);
    const entries: StockEntry[] = [];
    groups.forEach((group, groupIndex) => {
      if (withHeaders) {
        entries.push({
          kind: 'header',
          key: `h:${group.category ?? ''}`,
          title: group.category ?? t('rentals.noCategory'),
        });
      }
      group.items.forEach((item, index) => {
        entries.push({
          kind: 'item',
          key: item.id,
          item,
          isLast: index === group.items.length - 1 && groupIndex === groups.length - 1,
        });
      });
    });
    return entries;
  }, [allItems, needle, activeCategory, t]);

  /**
   * OMBOR PANELI: nechta buyum bor va ular BIR KUNDA qancha topadi.
   *
   * Hisob KO'RINIB TURGAN buyumlardan — kategoriya va qidiruv
   * qo'llanganidan keyin. Panel ro'yxat bilan bitta narsani ko'rsatishi
   * kerak (ijaralar tomonidagi qoidaning o'zi).
   *
   * "Bir kunda" soatlik buyumga ham tegishli: ilovaning hisobi bir
   * kunni 24 soat deb o'lchaydi (`billedUnitsBetween`), shuning uchun
   * soatlik narx 24 ga ko'paytiriladi — aks holda soatlik ombor
   * daromadsiz ko'rinardi.
   *
   * Miqdor TURLI birlikda bo'lishi mumkin (dona, m²) — ular bitta
   * songa qo'shiladi va bu TAXMINIY ko'rsatkich. Valyuta esa
   * qo'shilmaydi: har biri alohida qator.
   */
  const stockTotals = useMemo(() => {
    let quantity = 0;
    const byCurrency: Record<string, number> = {};
    for (const entry of stockEntries) {
      if (entry.kind !== 'item') continue;
      const item = entry.item;
      const count = Number(item.totalQuantity) || 0;
      quantity += count;
      const perDay = (Number(item.price) || 0) * (item.period === 'HOUR' ? 24 : 1);
      const code = item.currency ?? 'UZS';
      byCurrency[code] = (byCurrency[code] ?? 0) + perDay * count;
    }
    return {
      quantity,
      entries: Object.entries(byCurrency).filter(([, amount]) => amount > 0) as [string, number][],
    };
  }, [stockEntries]);

  // ---- Ijara amallari ----

  const openRentalForm = useCallback((item: RentalItemResponseDTO | null = null) => {
    setEditing(null);
    setPresetItem(item);
    setFormVisible(true);
  }, []);

  /** Kartadan "tahrirlash" — karta yopiladi, forma o'sha yozuv bilan ochiladi. */
  const handleEdit = useCallback((rental: RentalResponseDTO) => {
    setOpened(null);
    setPresetItem(null);
    setEditing(rental);
    setFormVisible(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormVisible(false);
    setEditing(null);
    setPresetItem(null);
  }, []);

  // ---- Ombor amallari ----

  const openItemForm = useCallback((item: RentalItemResponseDTO | null = null) => {
    setEditingItem(item);
    setItemFormVisible(true);
  }, []);

  const handleCloseItemForm = useCallback(() => {
    setItemFormVisible(false);
    setEditingItem(null);
  }, []);

  /** Ijara formasidan "omborga buyum qo'shish" — forma yopilib ombor formasi ochiladi. */
  const handleAddItemFromForm = useCallback(() => {
    handleCloseForm();
    setTab('stock');
    openItemForm(null);
  }, [handleCloseForm, openItemForm]);

  const handleItemEdit = useCallback(
    (item: RentalItemResponseDTO) => {
      setOpenedItem(null);
      openItemForm(item);
    },
    [openItemForm],
  );

  const handleItemGiveOut = useCallback(
    (item: RentalItemResponseDTO) => {
      setOpenedItem(null);
      openRentalForm(item);
    },
    [openRentalForm],
  );

  const handleItemOpenRental = useCallback((rental: RentalResponseDTO) => {
    setOpenedItem(null);
    setOpened(rental);
  }, []);

  const handleFab = useCallback(() => {
    if (tab === 'stock') openItemForm(null);
    else openRentalForm(null);
  }, [tab, openItemForm, openRentalForm]);

  const handleRefresh = useCallback(() => {
    itemsQuery.refetch();
    listQuery.refetch();
    summaryQuery.refetch();
  }, [itemsQuery, listQuery, summaryQuery]);

  // ---- Qatorlar ----

  const renderRental = useCallback<ListRenderItem<RentalResponseDTO>>(
    ({ item, index }) => {
      const isLast = index === rentals.length - 1;
      return (
        <View style={[styles.rowSlice, index === 0 && styles.rowFirst, isLast && styles.rowLast]}>
          <RentalRow item={item} isLast={isLast} onPress={setOpened} />
        </View>
      );
    },
    [rentals.length, styles],
  );

  const renderStock = useCallback<ListRenderItem<StockEntry>>(
    ({ item: entry, index }) => {
      const isFirst = index === 0;
      const isLast = index === stockEntries.length - 1;
      return (
        <View style={[styles.rowSlice, isFirst && styles.rowFirst, isLast && styles.rowLast]}>
          {entry.kind === 'header' ? (
            <Text style={styles.groupTitle} numberOfLines={1}>
              {entry.title}
            </Text>
          ) : (
            <RentalItemRow item={entry.item} isLast={entry.isLast} onPress={setOpenedItem} />
          )}
        </View>
      );
    },
    [stockEntries.length, styles],
  );

  const activeQuery = tab === 'stock' ? itemsQuery : listQuery;
  const error = activeQuery.error ? (activeQuery.error as Error).message : '';
  const refreshControl = (
    <RefreshControl
      refreshing={activeQuery.isRefetching}
      onRefresh={handleRefresh}
      tintColor={colors.primary}
    />
  );

  /**
   * SARLAVHA RO'YXAT ICHIDA — u bilan birga suriladi.
   *
   * Ilgari tepada oltita blok qotib turardi: tepa panel, sarlavha,
   * hisob kartasi, bo'lim tugmalari, qidiruv va kategoriya qatori.
   * Androidda ekran pastroq va ro'yxatga deyarli joy qolmasdi — bir
   * necha qator ko'rinib, qolgani uchun ekranning kichik oynasida
   * surishga to'g'ri kelardi.
   *
   * Endi faqat `ScreenTopBar` qotib turadi (hisob almashtirgich va
   * bildirishnoma — ular ilovaning doimiy qismi), qolgani surilib
   * ketadi va ro'yxatga BUTUN ekran qoladi. Yuqoriga qaytilsa
   * boshqaruvlar o'z joyida.
   *
   * Element sifatida beriladi (komponent emas): komponent berilsa RN
   * uni har renderda qaytadan ulardi va qidiruv maydonidagi fokus har
   * harfda yo'qolardi.
   */
  const listHeader = (
    <View>
      <View style={styles.titleRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {t('rentals.title')}
          </Text>
        </View>
      </View>

      <View style={styles.headerBody}>
        {tab === 'stock' ? (
          <RentalSummaryCard
            loading={itemsQuery.isLoading}
            countIcon="albums-outline"
            countLabel={t('rentals.stockCount')}
            countValue={formatQuantity(stockTotals.quantity)}
            moneyLabel={t('rentals.dailyRevenue')}
            moneyEntries={stockTotals.entries}
            moneyEmpty={t('rentals.noDailyRevenue')}
          />
        ) : (
          <RentalSummaryCard
            loading={summaryQuery.isLoading}
            countLabel={countLabel}
            countValue={String(summaryQuery.data?.matchedCount ?? 0)}
            moneyLabel={t('rentals.accruedTotal')}
            moneyEntries={accruedEntries}
            moneyEmpty={t('rentals.noAccrued')}
          />
        )}

        <ChipSelector options={tabOptions} value={tab} onChange={setTab} layout="fluid" />

        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder={tab === 'stock' ? t('rentals.searchItem') : t('rentals.searchPlaceholder')}
          accessibilityLabel={tab === 'stock' ? t('rentals.searchItem') : t('rentals.searchPlaceholder')}
        />

        {/* Kategoriya paneli FAQAT omborda: ijaralar ro'yxati buyum
            emas, kelishuvlar bo'yicha tuzilgan va kategoriya u yerda
            ma'no bermaydi. Narxnomadagi panelning aynan o'zi. */}
        {tab === 'stock' ? (
          <ProductCategoryBar
            categories={categoryChips}
            value={activeCategory}
            onChange={setActiveCategory}
            allowManage={allowWrite}
            onCreate={handleCreateCategory}
            onDelete={handleDeleteCategory}
          />
        ) : null}

        {tab === 'rentals' ? (
          <ChipSelector options={statusOptions} value={status} onChange={setStatus} layout="scroll" />
        ) : null}

        {error ? (
          <StatusBanner
            tone="error"
            message={error}
            actionLabel={t('common.retry')}
            onAction={handleRefresh}
          />
        ) : null}
      </View>
    </View>
  );

  /**
   * Bo'sh holat ham sarlavha BILAN chiqadi.
   *
   * Ilgari ro'yxat bo'sh bo'lsa butun ekran almashtirilar va qidiruv
   * bilan filtrlar yo'qolardi — odam "hech narsa topilmadi" ni ko'rib,
   * qidiruvni tozalay olmay qolardi.
   */
  const emptyBody = activeQuery.isLoading ? (
    <View style={styles.emptyCard}>
      <SkeletonContactList />
    </View>
  ) : tab === 'stock' ? (
    <View style={styles.emptyCard}>
      <EmptyState
        icon="cube-outline"
        title={needle ? t('rentals.stockNotFound') : t('rentals.stockEmptyTitle')}
        description={needle ? undefined : t('rentals.stockEmptyHint')}
        actionLabel={!needle && allowWrite ? t('rentals.addItem') : undefined}
        actionIcon="add"
        onAction={!needle && allowWrite ? () => openItemForm(null) : undefined}
      />
    </View>
  ) : (
    <View style={styles.emptyCard}>
      <EmptyState
        icon="cube-outline"
        title={t('rentals.emptyTitle')}
        description={t('rentals.emptyHint')}
        actionLabel={allowWrite ? t('rentals.createSubmit') : undefined}
        actionIcon="add"
        onAction={allowWrite ? () => openRentalForm(null) : undefined}
      />
    </View>
  );

  const renderBody = () => (
    <NestedGlass>
      {tab === 'stock' ? (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={stockEntries}
          keyExtractor={(entry) => entry.key}
          renderItem={renderStock}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyBody}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={rentals}
          keyExtractor={(item) => item.id}
          renderItem={renderRental}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyBody}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </NestedGlass>
  );

  const isEmpty = tab === 'stock' ? stockEntries.length === 0 : rentals.length === 0;

  return (
    <View style={styles.container}>
      {/* Dekorativ fon — barcha ekranlarda bir xil "imzo" qatlami. */}
      <AmbientBackground />

      {/* FAQAT shu qator qotib turadi: hisob almashtirgich va
          bildirishnoma ilovaning doimiy qismi. Qolgan sarlavha
          ro'yxat bilan birga suriladi — izohi `listHeader` da. */}
      <EntranceView style={styles.header} duration={300} fromY={12}>
        <ScreenTopBar />
      </EntranceView>

      {renderBody()}

      {allowWrite ? (
        <FloatingActionButton
          onPress={handleFab}
          accessibilityLabel={tab === 'stock' ? t('rentals.addItem') : t('rentals.createSubmit')}
          pulse={isEmpty}
        />
      ) : null}

      <RentalFormModal
        visible={formVisible}
        onClose={handleCloseForm}
        rental={editing}
        presetItem={presetItem}
        onAddItem={allowWrite ? handleAddItemFromForm : undefined}
      />
      <RentalDetailModal
        rental={opened}
        onClose={() => setOpened(null)}
        onEdit={handleEdit}
        allowWrite={allowWrite}
        allowDelete={allowDelete}
      />
      <RentalItemFormModal
        visible={itemFormVisible}
        onClose={handleCloseItemForm}
        item={editingItem}
        categories={categoryChips}
        defaultCategoryId={activeCategory || undefined}
      />
      <RentalItemDetailModal
        item={openedItem}
        onClose={() => setOpenedItem(null)}
        onEdit={handleItemEdit}
        onGiveOut={handleItemGiveOut}
        onOpenRental={handleItemOpenRental}
        allowWrite={allowWrite}
        allowDelete={allowDelete}
      />
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
    // Yuqori bo'shliq SARLAVHADAN keladi (u endi ro'yxat ichida):
    // bu yerda qo'shilsa, surilganda tepada bo'sh joy qolib ketardi.
    list: {
      flex: 1,
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
    groupTitle: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxs,
    },
  });

export default RentalListScreen;
