import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
  type SectionListRenderItem,
} from 'react-native';
import EmptyState from '../../../shared/ui/EmptyState';
import StatusBanner from '../../../shared/ui/StatusBanner';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import ProductRow from './ProductRow';
import { getBusinessProducts } from '../services/productService';
import type { ProductPublicDTO } from '../types/product';
import { groupByCategory } from '../model/groupByCategory';

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

  /**
   * Kategoriya bo'yicha bo'limlar.
   *
   * Guruhlar ham, ular ichidagi tartib ham SERVER tartibiga tayanadi:
   * ro'yxat "men ko'p olgan narsa tepada" bo'yicha keladi. Kategoriyasiz
   * mahsulotlar oxirgi bo'limda — izohi groupByCategory'da.
   */
  const sections = useMemo(
    () => groupByCategory(products, t('products.noCategory')),
    [products, t]
  );

  // Bo'lim ichidagi oxirgi qator: ajratuvchi chiziq chizilmasin.
  const renderProduct = useCallback<SectionListRenderItem<ProductPublicDTO, { id: string; title: string; data: ProductPublicDTO[] }>>(
    ({ item, index, section }) => (
      <ProductRow product={item} isLast={index === section.data.length - 1} />
    ),
    []
  );

  const keyExtractor = useCallback((item: ProductPublicDTO) => item.id, []);

  /**
   * Bitta bo'lim bo'lsa sarlavha chizilmaydi.
   *
   * "Boshqa" degan yolg'iz sarlavha hech qanday ma'lumot bermaydi — u faqat
   * BOSHQA guruhlardan ajratish uchun kerak. Kategoriyalar ishlatilmagan
   * do'konda narxnoma avvalgidek sodda ko'rinadi.
   */
  const showHeaders = sections.length > 1;

  return (
    <SectionList
      contentContainerStyle={styles.listCard}
      sections={sections}
      renderItem={renderProduct}
      renderSectionHeader={({ section }) => {
        if (!showHeaders) return null;
        // Chiziq sarlavha USTIDA: u kategoriyalarni bir-biridan ajratadi.
        // Qatorlar orasidagi ingichka chiziqlar esa kategoriya ICHIDA qoladi —
        // ikkovi aralashsa, oxirgi qatordan keyingi chiziq "yangi bo'lim
        // boshlandi" degandek ko'rinib, sanoq bilan ro'yxat mos kelmay
        // qolgandek tuyulardi.
        const isFirst = sections[0]?.id === section.id;
        return (
          <View style={[styles.sectionHeader, !isFirst && styles.sectionDivider]}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        );
      }}
      stickySectionHeadersEnabled={false}
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
const createStyles = ({ colors, spacing, radius, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    listCard: {
      ...glass.pane,
      borderRadius: radius.xxl,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      overflow: 'hidden',
      ...shadows.card,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxs,
    },
    // Kategoriyalar orasidagi ajratgich — qator chiziqlaridan QALINROQ,
    // shunda "bo'lim tugadi" va "keyingi mahsulot" farqlanadi.
    sectionDivider: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.sm,
      paddingTop: spacing.md,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      color: colors.textSecondary,
      flexShrink: 1,
    },
    sectionCount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });

export default BusinessCatalogPane;
