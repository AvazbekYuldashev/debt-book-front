import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, type ListRenderItem } from 'react-native';
import EmptyState from '../../../shared/ui/EmptyState';
import StatusBanner from '../../../shared/ui/StatusBanner';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import ProductRow from './ProductRow';
import { getBusinessProducts } from '../services/productService';
import type { ProductPublicDTO } from '../types/product';

interface BusinessCatalogPaneProps {
  businessId: string;
  token?: string;
  /**
   * Sahifa ko'rilgunicha so'rov yuborilmaydi: kontakt ochilganda odam
   * odatda TARIXNI izlaydi, katalog esa surilgandan keyin kerak bo'ladi.
   */
  active: boolean;
}

const PAGE_SIZE = 100;

/** Begona biznesning narxnomasi — faqat o'qish uchun (mijoz ko'rinishi). */
const BusinessCatalogPane: React.FC<BusinessCatalogPaneProps> = ({ businessId, token, active }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [products, setProducts] = useState<ProductPublicDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (showSpinner = true) => {
      if (!token || !businessId) return;
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const page = await getBusinessProducts({ businessId, size: PAGE_SIZE, token });
        setProducts(page.content);
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('products.loadFailed'));
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [businessId, token, t]
  );

  useEffect(() => {
    if (active && !loaded && !loading) load(true);
  }, [active, loaded, loading, load]);

  const lastIndex = products.length - 1;
  const renderProduct = useCallback<ListRenderItem<ProductPublicDTO>>(
    ({ item, index }) => <ProductRow product={item} isLast={index === lastIndex} />,
    [lastIndex]
  );

  const keyExtractor = useCallback((item: ProductPublicDTO) => item.id, []);

  return (
    <FlatList
      contentContainerStyle={styles.listCard}
      data={products}
      renderItem={renderProduct}
      keyExtractor={keyExtractor}
      showsVerticalScrollIndicator={false}
      initialNumToRender={14}
      windowSize={11}
      refreshControl={
        <RefreshControl
          refreshing={loading && products.length > 0}
          onRefresh={() => load(true)}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.surface}
        />
      }
      ListHeaderComponent={
        error ? (
          <StatusBanner
            tone="error"
            message={error}
            actionLabel={t('common.retry')}
            onAction={() => load(true)}
          />
        ) : null
      }
      ListEmptyComponent={
        // Yuklanmagunicha skeleton: sahifa ochilishidan OLDIN "mahsulot yo'q"
        // deb yozib qo'yish yolg'on bo'lardi — so'rov hali ketmagan ham.
        !loaded && !error ? (
          <SkeletonContactList count={4} />
        ) : error ? null : (
          <EmptyState icon="pricetags-outline" title={t('products.businessEmpty')} />
        )
      }
    />
  );
};

// Karta ko'rinishi ContactDetailScreen'dagi tarix kartasi bilan AYNAN bir xil:
// ikki sahifa surilganda bir-biriga o'xshamasa, almashinuv "sakrash" bo'lib
// ko'rinardi.
const createStyles = ({ spacing, radius, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    listCard: {
      ...glass.pane,
      borderRadius: radius.xxl,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      overflow: 'hidden',
      ...shadows.card,
    },
  });

export default BusinessCatalogPane;
