import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import {
  FlatList,
  type ListRenderItem,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import EntranceView from '../../../shared/ui/EntranceView';
import SearchField from '../../../shared/ui/SearchField';
import StatusBanner from '../../../shared/ui/StatusBanner';
import SurfaceLabel from '../../../shared/ui/SurfaceLabel';
import ScreenTopBar from '../../../app/components/ScreenTopBar';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import { FAB_CLEARANCE } from '../../../shared/ui/fabLayout';
import { AuthContext } from '../../auth/context/AuthContext';
import { WorkspaceContext } from '../../business/context/WorkspaceContext';
import { canDelete, canWrite } from '../../../shared/lib/permissions';
import { confirmAction } from '../../../shared/lib/confirm';
import { useI18n } from '../../../shared/i18n';
import { NestedGlass, useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import type { ProductsScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';
import ProductRow from '../components/ProductRow';
import ProductCategoryBar from '../components/ProductCategoryBar';
import ProductFormModal, { ProductFormValues } from '../components/ProductFormModal';
import { createProduct, deleteProduct, getProducts, updateProduct } from '../services/productService';
import { buildProductPayload } from '../model/productPayload';
import type { ProductResponseDTO } from '../types/product';
import { createCategory, deleteCategory, getCategories } from '../../expenses/services/categoryService';
import type { CategoryResponseDTO } from '../../expenses/types/category';
import { isQueuedOffline } from '../../../shared/api/apiClient';
import { useAccountContext } from '../../../shared/hooks/useAccountContext';
import { prependToCache, removeFromCache } from '../../../shared/lib/listCache';
import { categoriesKey } from '../../expenses/model/expenseCache';
import { buildPendingProduct, productsKey } from '../model/productCache';

type Props = ProductsScreenProps<typeof ROUTES.PRODUCT_LIST>;
type FormMode = 'create' | 'edit';

const PAGE_SIZE = 100;

/**
 * Biznes narxnomasi: mahsulot/xizmatlar va ularning narxlari.
 *
 * Faqat biznes ish maydonida ma'noga ega — shaxsiy rejimda server ham
 * X-Business-ID talab qiladi, shuning uchun ekran so'rov YUBORMAY turib
 * tushuntirish ko'rsatadi (bo'sh xato bannerini kutib o'tirmaydi).
 */
const ProductsScreen: React.FC<Props> = () => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);

  const isBusiness = workspace.mode === 'business' && Boolean(workspace.activeBusinessId);
  const role = workspace.activeBusinessRole;
  const allowWrite = isBusiness && canWrite(role);
  const allowDelete = isBusiness && canDelete(role);

  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();
  const { accountKey } = useAccountContext();

  const [products, setProducts] = useState<ProductResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<CategoryResponseDTO[]>([]);
  // Bo'sh satr = "hammasi"; boshqa qiymat = kategoriya id'si.
  const [activeCategory, setActiveCategory] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<ProductResponseDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const loadProducts = useCallback(
    async (showSpinner = true) => {
      /*
       * KESH DISKDAN TIKLANMAGUNCHA kutamiz.
       *
       * Tiklash asinxron: ilova ochilgan zahoti kesh hali bo'sh
       * bo'ladi. Shu paytda o'qilsa "keshda hech narsa yo'q" degan
       * xulosa chiqar va oflaynda ekran bo'sh qolib, ustiga xato
       * yozilardi — aynan ma'lumot qurilmada YOTGAN holda. Tiklash
       * tugagach bu funksiya o'zi qayta chaqiriladi.
       */
      if (isRestoring) {
        if (showSpinner) setLoading(true);
        return;
      }

      if (!profile?.jwt || !isBusiness) {
        setProducts([]);
        return;
      }
      /*
       * NARXNOMA KESHDAN DARHOL CHIQADI.
       *
       * Kesh diskka saqlanadi: ilova tarmoqsiz ochilganda ham
       * narxnoma to'ldirilgan holda ko'rinadi. Bu bo'lim ayniqsa
       * oflaynda kerak — narx savdo paytida, do'kon ichida so'raladi.
       */
      const cacheKey = productsKey(accountKey);
      const cached = queryClient.getQueryData<ProductResponseDTO[]>(cacheKey);
      if (cached) setProducts(cached);

      if (showSpinner && !cached) setLoading(true);
      setError('');
      try {
        const page = await getProducts({ page: 1, size: PAGE_SIZE, token: profile.jwt });
        setProducts(page.content);
        queryClient.setQueryData(cacheKey, page.content);
      } catch (e) {
        // Keshdan ko'rsatilayotgan bo'lsa qizil xabar qo'yilmaydi —
        // ekranda ma'lumot turibdi, oflayn ekani tepada aytilgan.
        if (!cached) setError(e instanceof Error ? e.message : t('products.loadFailed'));
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [accountKey, isRestoring, profile?.jwt, isBusiness, queryClient, t]
  );

  /**
   * Narxnoma kategoriyalari.
   *
   * `type: 'PRODUCT'` MAJBURIY: shu parametrsiz server xarajat
   * kategoriyalarini qaytaradi va ular narxnomada paydo bo'lib qolardi.
   */
  const loadCategories = useCallback(async () => {
    // Kesh tiklanmaguncha kutamiz — yuqoridagi `loadProducts` kabi.
    if (isRestoring) return;
    if (!profile?.jwt || !isBusiness) {
      setCategories([]);
      return;
    }
    const cacheKey = categoriesKey(accountKey, 'PRODUCT');
    const cached = queryClient.getQueryData<CategoryResponseDTO[]>(cacheKey);
    if (cached) setCategories(cached);
    try {
      const page = await getCategories({ page: 1, size: 100, type: 'PRODUCT', token: profile.jwt });
      const next = page.content ?? [];
      setCategories(next);
      queryClient.setQueryData(cacheKey, next);
    } catch {
      // Kategoriyalar kelmasa ro'yxat baribir ishlaydi — filtr chiqmaydi,
      // xolos. Keshdagisi bor bo'lsa u o'rnida qoladi.
      if (!cached) setCategories([]);
    }
  }, [accountKey, isRestoring, profile?.jwt, isBusiness, queryClient]);

  // Ish maydoni almashsa ham qayta yuklanadi: loadProducts activeBusinessId ga
  // bog'liq emas, lekin ekran har fokusda yangilanadi va WorkspaceSwitcher
  // almashtirgandan keyin shu yerga qaytadi.
  useFocusEffect(
    useCallback(() => {
      loadProducts(true);
      loadCategories();
    }, [loadProducts, loadCategories, workspace.activeBusinessId])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts(false);
    setRefreshing(false);
  }, [loadProducts]);

  // Qidiruv mahalliy: ro'yxat bitta sahifaga sig'adi va har harfda so'rov
  // yuborish shart emas. Server tomonda ham `search` bor - ro'yxat o'sganda
  // shu yerdan ulanadi.
  const visibleProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      // Kategoriya filtri qidiruvdan OLDIN: tanlangan bo'limdan tashqaridagi
      // mahsulot qidiruvda ham chiqmasligi kerak, aks holda filtr "yolg'on"
      // bo'lardi.
      if (activeCategory && (product.categoryId ?? '') !== activeCategory) return false;
      if (!needle) return true;
      return [product.name, product.code, product.description]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [products, search, activeCategory]);

  const openCreate = useCallback(() => {
    setMode('create');
    setEditing(null);
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((product: ProductResponseDTO) => {
    setMode('edit');
    setEditing(product);
    setModalVisible(true);
  }, []);

  const submitProduct = useCallback(
    async (values: ProductFormValues): Promise<boolean> => {
      if (!profile?.jwt) return false;
      setSaving(true);
      setError('');
      try {
        const payload = buildProductPayload(values);
        if (mode === 'edit' && editing) {
          await updateProduct({ id: editing.id, ...payload }, profile.jwt);
        } else {
          await createProduct(payload, profile.jwt);
        }
        await loadProducts(false);
        return true;
      } catch (e) {
        /*
         * Oflaynda amal navbatga tushdi — yo'qolmadi, xato ham emas.
         * Yangi mahsulot ro'yxatga DARHOL qo'shiladi: aks holda odam
         * "saqlanmadi" deb o'ylab qayta kiritar va internet qaytganda
         * narxnomada ikkita bir xil qator paydo bo'lardi.
         */
        if (isQueuedOffline(e)) {
          if (mode !== 'edit') {
            const payload = buildProductPayload(values);
            const categoryName = categories.find((c) => c.id === payload.categoryId)?.name;
            const row = buildPendingProduct(e.key, payload, categoryName);
            setProducts((prev) => [row, ...prev]);
            prependToCache(queryClient, productsKey(accountKey), row);
          }
          return true;
        }
        setError(e instanceof Error ? e.message : t('products.saveFailed'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [accountKey, categories, profile?.jwt, mode, editing, loadProducts, queryClient, t]
  );

  const createProductCategory = useCallback(
    async (name: string): Promise<boolean> => {
      if (!profile?.jwt) return false;
      try {
        // type MAJBURIY: ko'rsatilmasa server xarajat kategoriyasi yaratadi
        // va u narxnomada umuman ko'rinmasdi.
        const created = await createCategory({ name, type: 'PRODUCT' }, profile.jwt);
        await loadCategories();
        // Yangi kategoriya darhol tanlanadi — odam uni endigina yaratdi,
        // ehtimol shunga mahsulot qo'shmoqchi.
        if (created?.id) setActiveCategory(created.id);
        return true;
      } catch {
        return false;
      }
    },
    [profile?.jwt, loadCategories]
  );

  const removeCategory = useCallback(
    (category: { id: string; name: string }) => {
      if (!profile?.jwt) return;
      confirmAction(t('products.deleteCategoryConfirm', { name: category.name }), async () => {
        try {
          await deleteCategory(category.id, profile.jwt);
          // Filtr o'chirilgan kategoriyada turgan bo'lsa "hammasi"ga qaytamiz,
          // aks holda ro'yxat bo'sh ko'rinib qolardi.
          setActiveCategory((current) => (current === category.id ? '' : current));
          await loadCategories();
          // Mahsulotlar ham qayta o'qiladi: kategoriya o'chgach ular
          // "kategoriyasiz" bo'lib qoladi (server ON DELETE SET NULL).
          await loadProducts(false);
        } catch (e) {
          // Oflaynda kategoriya ro'yxatdan DARHOL yo'qoladi — qolib
          // tursa odam yana bosar va amal ikki marta navbatga tushardi.
          if (isQueuedOffline(e)) {
            setActiveCategory((current) => (current === category.id ? '' : current));
            setCategories((prev) => prev.filter((item) => item.id !== category.id));
            removeFromCache(queryClient, categoriesKey(accountKey, 'PRODUCT'), category.id);
            return;
          }
          setError(e instanceof Error ? e.message : t('products.saveFailed'));
        }
      });
    },
    [accountKey, profile?.jwt, loadCategories, loadProducts, queryClient, t]
  );

  const requestDelete = useCallback(
    (product: ProductResponseDTO) => {
      if (!profile?.jwt) return;
      confirmAction(t('products.deleteConfirm', { name: product.name }), async () => {
        setDeletingId(product.id);
        setError('');
        try {
          await deleteProduct(product.id, profile.jwt);
          await loadProducts(false);
        } catch (e) {
          if (isQueuedOffline(e)) {
            setProducts((prev) => prev.filter((item) => item.id !== product.id));
            removeFromCache(queryClient, productsKey(accountKey), product.id);
            return;
          }
          setError(e instanceof Error ? e.message : t('products.deleteFailed'));
        } finally {
          setDeletingId('');
        }
      });
    },
    [accountKey, profile?.jwt, loadProducts, queryClient, t]
  );

  // Bo'sh holat o'z kartasida: aks holda sarlavha va izoh to'g'ridan-to'g'ri
  // fon rasmi ustida qolib, to'q rasmda o'qilmasdi. EmptyState'ning `card`i
  // emas: u yana marginHorizontal qo'shadi, kontent esa allaqachon
  // chekinishli - karta qidiruv maydoni va ro'yxatdan torroq chiqardi.
  const inCard = (node: React.ReactNode) => (
    <View style={styles.emptyCard}>
      <NestedGlass>{node}</NestedGlass>
    </View>
  );

  /**
   * SARLAVHA RO'YXAT ICHIDA — u bilan birga suriladi.
   *
   * Ilgari tepada sarlavha, qidiruv va kategoriya qatori qotib turardi
   * va ro'yxatga ekranning pastki yarmi qolardi. Androidda bu sezilarli:
   * bir vaqtda uch-to'rt qator ko'rinib, qolgani uchun kichik oynada
   * surishga to'g'ri kelardi.
   *
   * Element sifatida beriladi (komponent emas): komponent berilsa RN uni
   * har renderda qaytadan ulardi va qidiruvdagi fokus har harfda
   * yo'qolardi.
   */
  const listHeader = (
    <View>
      {/* Ekran nomi ALMASHTIRGICH QATORIDA — Qarzlar, Gap va Xarajatlar
          bilan bir xil. Alohida blok ekranda bir qator egallab turar va
          ro'yxat shuncha pastga surilardi. */}
      {error ? (
        <View style={styles.banner}>
          <StatusBanner
            tone="error"
            message={error}
            actionLabel={t('common.retry')}
            onAction={() => loadProducts(true)}
          />
        </View>
      ) : null}
      {/* Bo'lim tabletkasi ATAYIN yo'q: tepa qatordagi ekran nomi
          allaqachon "Mahsulotlar" deydi va tabletka o'sha so'zni
          takrorlardi. Qarzlarda u ma'noli, chunki ro'yxat boshqa narsa
          — "Kontaktlar". */}
      {isBusiness && products.length > 0 ? (
        <View style={styles.searchWrap}>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder={t('products.search')}
            accessibilityLabel={t('products.search')}
          />
        </View>
      ) : null}
      {isBusiness ? (
        <ProductCategoryBar
          categories={categories.map((category) => ({ id: category.id, name: category.name }))}
          value={activeCategory}
          onChange={setActiveCategory}
          allowManage={allowWrite}
          onCreate={createProductCategory}
          onDelete={removeCategory}
        />
      ) : null}
      {visibleProducts.length > 0 ? (
        <SurfaceLabel style={styles.count}>
          {t('products.count', { count: visibleProducts.length })}
        </SurfaceLabel>
      ) : null}
    </View>
  );

  /** Bo'sh holat ham sarlavha BILAN chiqadi — qidiruvni tozalash yo'li yo'qolmasin. */
  const emptyBody = !isBusiness ? (
    inCard(
      <EmptyState
        icon="business-outline"
        title={t('products.businessOnly')}
        description={t('products.businessOnlyHint')}
      />
    )
  ) : loading ? (
    <SkeletonContactList count={5} />
  ) : products.length === 0 ? (
    inCard(
      <EmptyState
        icon="pricetags-outline"
        title={t('products.empty')}
        description={t('products.emptyHint')}
        actionLabel={allowWrite ? t('products.add') : undefined}
        onAction={allowWrite ? openCreate : undefined}
      />
    )
  ) : (
    inCard(
      <EmptyState
        icon="search-outline"
        title={t('products.notFound')}
        description={t('products.notFoundHint')}
      />
    )
  );

  /*
   * Qator KARTA SIRTIDA: birinchisi va oxirgisi yumaloqlanadi, shunda
   * ro'yxat bitta karta bo'lib ko'rinadi. Ilgari hamma qator bitta
   * `Card` ichida `.map()` bilan chizilardi — u butun ro'yxatni bir
   * vaqtda render qilar va uzun narxnomada ekran qotib qolardi
   * (xuddi shu nuqson kontakt tarixida ham bor edi va FlatList bilan
   * tuzatilgan).
   */
  const renderProduct = useCallback<ListRenderItem<ProductResponseDTO>>(
    ({ item, index }) => {
      const isLast = index === visibleProducts.length - 1;
      return (
        <View style={[styles.rowSlice, index === 0 && styles.rowFirst, isLast && styles.rowLast]}>
          <ProductRow
            product={item}
            isLast={isLast}
            allowManage={allowWrite}
            allowDelete={allowDelete}
            deleting={deletingId === item.id}
            onEdit={openEdit}
            onRequestDelete={requestDelete}
          />
        </View>
      );
    },
    [visibleProducts.length, allowWrite, allowDelete, deletingId, openEdit, requestDelete, styles],
  );

  return (
    <View style={styles.container}>
      <AmbientBackground />
      {/* FAQAT shu qator qotib turadi: hisob almashtirgich va
          bildirishnoma ilovaning doimiy qismi. */}
      <EntranceView style={styles.header} duration={300} fromY={12}>
        <ScreenTopBar title={t('tab.products')} />
      </EntranceView>

      <FlatList
        style={styles.scroll}
        contentContainerStyle={styles.content}
        data={visibleProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyBody}
        ListFooterComponent={
          !allowWrite && isBusiness ? (
            <SurfaceLabel style={styles.readOnly} textStyle={styles.readOnlyText} multiline>
              {t('products.readOnly')}
            </SurfaceLabel>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {allowWrite ? (
        <FloatingActionButton
          onPress={openCreate}
          pulse={products.length === 0}
          accessibilityLabel={t('products.add')}
        />
      ) : null}

      <ProductFormModal
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        // Filtr "Hammasi"da tursa bo'sh — majburlamaymiz.
        defaultCategoryId={activeCategory}
        visible={modalVisible}
        mode={mode}
        initial={editing}
        submitting={saving}
        onClose={() => setModalVisible(false)}
        onSubmit={submitProduct}
      />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, glass }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      backgroundColor: 'transparent',
    },
    banner: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
    searchWrap: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xxs,
      paddingBottom: spacing.xs,
    },
    scroll: {
      flex: 1,
    },
    // Yon bo'shliq QATORGA beriladi, konteynerga emas: sarlavha endi
    // shu ro'yxat ichida va unga o'z paddingi yetarli.
    content: {
      paddingTop: spacing.xs,
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
    /**
     * Yon chekinish SHART: ro'yxat konteynerida gorizontal chekinish
     * yo'q (uni har qator o'zi beradi), shuning uchun chekinishsiz
     * karta ekranning ikki chetiga yopishib qolardi. Qarzlar, Gap va
     * Ijara ekranlarida bu allaqachon shunday edi — faqat shu yer
     * qolib ketgan.
     */
    emptyCard: {
      ...glass.surface,
      borderRadius: radius.xxl,
      marginHorizontal: spacing.md,
      overflow: 'hidden',
    },
    // Faqat joylashuv: shrift va rangni SurfaceLabel beradi.
    // Yon chekinish qo'shnilari bilan bir xil: 4px da u qatorlardan va
    // qidiruv maydonidan 12px chapga chiqib turardi.
    count: {
      marginBottom: spacing.xs,
      marginHorizontal: spacing.md,
    },
    listCard: {
      padding: spacing.xxs,
    },
    // alignSelf center: pill markazda qoladi (SurfaceLabel'ning flex-start'i ustidan).
    readOnly: {
      alignSelf: 'center',
      marginTop: spacing.sm,
    },
    readOnlyText: {
      textAlign: 'center',
    },
  });

export default ProductsScreen;
