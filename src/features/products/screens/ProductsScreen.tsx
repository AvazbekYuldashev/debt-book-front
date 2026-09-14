import React, { useCallback, useContext, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import EntranceView from '../../../shared/ui/EntranceView';
import SearchField from '../../../shared/ui/SearchField';
import StatusBanner from '../../../shared/ui/StatusBanner';
import ScreenTopBar from '../../../app/components/ScreenTopBar';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import { FAB_CLEARANCE } from '../../../shared/ui/fabLayout';
import { AuthContext } from '../../auth/context/AuthContext';
import { WorkspaceContext } from '../../business/context/WorkspaceContext';
import { canDelete, canWrite } from '../../../shared/lib/permissions';
import { confirmAction } from '../../../shared/lib/confirm';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import type { ProductsScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';
import ProductRow from '../components/ProductRow';
import ProductFormModal, { ProductFormValues } from '../components/ProductFormModal';
import { createProduct, deleteProduct, getProducts, updateProduct } from '../services/productService';
import type { ProductResponseDTO } from '../types/product';

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

  const [products, setProducts] = useState<ProductResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<ProductResponseDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const loadProducts = useCallback(
    async (showSpinner = true) => {
      if (!profile?.jwt || !isBusiness) {
        setProducts([]);
        return;
      }
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const page = await getProducts({ page: 1, size: PAGE_SIZE, token: profile.jwt });
        setProducts(page.content);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('products.loadFailed'));
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [profile?.jwt, isBusiness, t]
  );

  // Ish maydoni almashsa ham qayta yuklanadi: loadProducts activeBusinessId ga
  // bog'liq emas, lekin ekran har fokusda yangilanadi va WorkspaceSwitcher
  // almashtirgandan keyin shu yerga qaytadi.
  useFocusEffect(
    useCallback(() => {
      loadProducts(true);
    }, [loadProducts, workspace.activeBusinessId])
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
    if (!needle) return products;
    return products.filter((product) =>
      [product.name, product.code, product.description]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle))
    );
  }, [products, search]);

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
        const payload = {
          name: values.name,
          price: values.price,
          currency: values.currency,
          unit: values.unit,
          // Bo'sh matn yuborilmaydi: server uchun "kod yo'q" va "kod bo'sh satr"
          // bir xil bo'lishi kerak, aks holda yagonalik tekshiruvi bo'sh
          // satrlarni ham to'qnashtirardi.
          ...(values.code ? { code: values.code } : {}),
          ...(values.description ? { description: values.description } : {}),
        };
        if (mode === 'edit' && editing) {
          await updateProduct({ id: editing.id, ...payload }, profile.jwt);
        } else {
          await createProduct(payload, profile.jwt);
        }
        await loadProducts(false);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('products.saveFailed'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [profile?.jwt, mode, editing, loadProducts, t]
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
          setError(e instanceof Error ? e.message : t('products.deleteFailed'));
        } finally {
          setDeletingId('');
        }
      });
    },
    [profile?.jwt, loadProducts, t]
  );

  const renderBody = () => {
    if (!isBusiness) {
      return (
        <EmptyState
          icon="business-outline"
          title={t('products.businessOnly')}
          description={t('products.businessOnlyHint')}
        />
      );
    }

    if (loading) {
      return <SkeletonContactList count={5} />;
    }

    if (products.length === 0) {
      return (
        <EmptyState
          icon="pricetags-outline"
          title={t('products.empty')}
          description={t('products.emptyHint')}
          actionLabel={allowWrite ? t('products.add') : undefined}
          onAction={allowWrite ? openCreate : undefined}
        />
      );
    }

    if (visibleProducts.length === 0) {
      return (
        <EmptyState
          icon="search-outline"
          title={t('products.notFound')}
          description={t('products.notFoundHint')}
        />
      );
    }

    return (
      <EntranceView>
        <Text style={styles.count}>{t('products.count', { count: visibleProducts.length })}</Text>
        <Card style={styles.listCard}>
          {visibleProducts.map((product, index) => (
            <ProductRow
              key={product.id}
              product={product}
              isLast={index === visibleProducts.length - 1}
              allowManage={allowWrite}
              allowDelete={allowDelete}
              deleting={deletingId === product.id}
              onEdit={openEdit}
              onRequestDelete={requestDelete}
            />
          ))}
        </Card>
        {!allowWrite ? <Text style={styles.readOnly}>{t('products.readOnly')}</Text> : null}
      </EntranceView>
    );
  };

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <EntranceView style={styles.header} duration={300} fromY={12}>
        <ScreenTopBar />
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {t('products.title')}
          </Text>
        </View>
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
      </EntranceView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {renderBody()}
      </ScrollView>

      {allowWrite ? (
        <FloatingActionButton
          onPress={openCreate}
          pulse={products.length === 0}
          accessibilityLabel={t('products.add')}
        />
      ) : null}

      <ProductFormModal
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

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      backgroundColor: 'transparent',
    },
    headerRow: {
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xxs,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
    },
    banner: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
    searchWrap: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: FAB_CLEARANCE,
    },
    count: {
      ...typography.caption,
      marginBottom: spacing.xs,
      marginLeft: spacing.xxs,
      color: colors.textSecondary,
    },
    listCard: {
      padding: spacing.xxs,
    },
    readOnly: {
      ...typography.caption,
      marginTop: spacing.sm,
      textAlign: 'center',
      color: colors.textSecondary,
    },
  });

export default ProductsScreen;
