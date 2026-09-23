import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import SearchField from '../../../shared/ui/SearchField';
import StatusBanner from '../../../shared/ui/StatusBanner';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { formatMoney } from '../../../shared/lib/money';
import { normalizeCurrency } from '../../../shared/lib/currency';
import { formatQuantity } from '../../../shared/lib/quantity';
import type { Currency, MoneyItemCreateDTO } from '../../../shared/types/money';
import { getBusinessProducts } from '../services/productService';
import { normalizeProductUnit, type ProductPublicDTO } from '../types/product';
import { formatUnitLabel } from '../model/unitLabel';
import {
  ALL_CATEGORIES,
  categoriesFromProducts,
  matchesCategory,
} from '../model/productCategories';

export interface BasketResult {
  items: MoneyItemCreateDTO[];
  /** Mahalliy hisob — server baribir qayta hisoblaydi, bu faqat ko'rsatish uchun. */
  total: number;
  currency: Currency;
  /** "5000×2+98000×1" — kalkulyator izohi bilan bir xil format. */
  calcNote: string;
}

interface ProductBasketModalProps {
  visible: boolean;
  businessId: string;
  token?: string;
  /**
   * Formada allaqachon turgan qatorlar.
   *
   * Ularsiz oyna har safar BO'SH ochilardi: ovoz bilan 4 ta Fanta
   * tanlangandan keyin "narxnomadan tanlash" ni ochgan odam 0 ni ko'rar,
   * va 3 ta qilmoqchi bo'lsa avvalgi tanlov yo'qolardi.
   */
  initialItems?: MoneyItemCreateDTO[];
  onClose: () => void;
  onConfirm: (result: BasketResult) => void;
}

/** Bitta bosishda o'zgaradigan miqdor. Kasr kerak bo'lsa maydonga yoziladi. */
const STEP = 1;

/**
 * Do'kon narxnomasidan savat yig'ish: mahsulot yonidagi "+" bilan miqdor
 * ortadi, pastda jami summa turadi.
 *
 * Savat MAHALLIY hisoblanadi — faqat ko'rsatish uchun. Yakuniy summani server
 * o'z narxnomasidan qayta hisoblaydi: narx savat yig'ilayotgan payt
 * o'zgargan bo'lishi mumkin va mijozning hisobiga ishonib bo'lmaydi.
 */
const ProductBasketModal: React.FC<ProductBasketModalProps> = ({
  visible,
  businessId,
  token,
  initialItems,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [products, setProducts] = useState<ProductPublicDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  // productId -> miqdor (matn: foydalanuvchi 1.5 kabi kasr yozishi mumkin).
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token || !businessId) return;
    setLoading(true);
    setError('');
    try {
      const page = await getBusinessProducts({ businessId, size: 100, token });
      setProducts(page.content);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('products.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [businessId, token, t]);

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setCategory(ALL_CATEGORIES);

    // Oyna FORMADAGI holat bilan ochiladi, noldan emas — aks holda
    // tanlangan qatorlar ko'rinmay, ularni tuzatmoqchi bo'lgan odam
    // hammasini boshqatdan yig'ishga majbur bo'lardi.
    const seeded: Record<string, string> = {};
    for (const item of initialItems ?? []) {
      if (item?.productId && item.quantity > 0) seeded[item.productId] = String(item.quantity);
    }
    setQuantities(seeded);

    if (!loaded) load();
  }, [visible, loaded, load, initialItems]);

  /**
   * Filtr chiplari MAHSULOTLARDAN quriladi, serverdan alohida so'ralmaydi:
   * mijoz begona biznesning kategoriyalarini o'qiy olmaydi (u endpoint
   * ko'ruvchining o'z ish maydonini qaytaradi). Izohi productCategories'da.
   */
  const categoryOptions = useMemo(
    () => categoriesFromProducts(products, t('products.noCategory')),
    [products, t]
  );

  const visibleProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      // Kategoriya qidiruvdan OLDIN: tanlangan bo'limdan tashqaridagi
      // mahsulot qidiruvda ham chiqmasligi kerak.
      if (!matchesCategory(product, category)) return false;
      if (!needle) return true;
      return [product.name, product.code]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [products, search, category]);

  const readQuantity = useCallback(
    (id: string): number => {
      const raw = quantities[id];
      if (!raw) return 0;
      const parsed = Number(raw.replace(',', '.'));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    },
    [quantities]
  );

  const setQuantity = useCallback((id: string, next: number) => {
    setQuantities((prev) => {
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = formatQuantity(next);
      return copy;
    });
  }, []);

  const selected = useMemo(
    () => products.filter((product) => readQuantity(product.id) > 0),
    [products, readQuantity]
  );

  // Savatdagi barcha mahsulot BIR valyutada bo'lishi shart — server ham
  // shuni talab qiladi (bitta oldi-berdi = bitta valyuta).
  const basketCurrency = useMemo<Currency | null>(
    () => (selected.length > 0 ? normalizeCurrency(selected[0].currency) : null),
    [selected]
  );
  const mixedCurrency = useMemo(
    () => selected.some((product) => normalizeCurrency(product.currency) !== basketCurrency),
    [selected, basketCurrency]
  );

  const total = useMemo(
    () => selected.reduce((sum, product) => sum + product.price * readQuantity(product.id), 0),
    [selected, readQuantity]
  );

  const handleConfirm = useCallback(() => {
    if (selected.length === 0 || !basketCurrency || mixedCurrency) return;
    onConfirm({
      items: selected.map((product) => ({ productId: product.id, quantity: readQuantity(product.id) })),
      total,
      currency: basketCurrency,
      calcNote: selected
        .map((product) => `${formatQuantity(product.price)}×${formatQuantity(readQuantity(product.id))}`)
        .join('+'),
    });
  }, [selected, basketCurrency, mixedCurrency, total, readQuantity, onConfirm]);

  const renderBody = () => {
    if (loading && products.length === 0) return <SkeletonContactList count={4} />;
    if (error) {
      return <StatusBanner tone="error" message={error} actionLabel={t('common.retry')} onAction={load} />;
    }
    if (products.length === 0) {
      return <EmptyState icon="pricetags-outline" title={t('products.businessEmpty')} />;
    }
    if (visibleProducts.length === 0) {
      return <EmptyState icon="search-outline" title={t('products.notFound')} />;
    }

    return visibleProducts.map((product) => {
      const quantity = readQuantity(product.id);
      const currency = normalizeCurrency(product.currency);
      const unit = normalizeProductUnit(product.unit);
      return (
        <View key={product.id} style={[styles.row, quantity > 0 && styles.rowActive]}>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {product.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {formatMoney(product.price, currency)} / {formatUnitLabel(product.amount, t(`products.unit.${unit}`))}
            </Text>
          </View>

          <View style={styles.stepper}>
            <Pressable
              onPress={() => setQuantity(product.id, quantity - STEP)}
              disabled={quantity <= 0}
              hitSlop={8}
              style={({ pressed }) => [styles.stepBtn, pressed && styles.stepPressed, quantity <= 0 && styles.stepDisabled]}
              accessibilityRole="button"
              accessibilityLabel={`${product.name} ${t('basket.decrease')}`}
            >
              <Ionicons name="remove" size={16} color={quantity <= 0 ? colors.textSecondary : colors.primary} />
            </Pressable>

            {/* Matn maydoni: "1.5 kg" kabi kasr miqdorni tugma bilan emas,
                yozib kiritish kerak bo'ladi. */}
            <TextInput
              style={styles.qtyInput}
              value={quantities[product.id] ?? ''}
              onChangeText={(value) =>
                setQuantities((prev) => ({ ...prev, [product.id]: value.replace(/[^\d.,]/g, '') }))
              }
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              inputMode="decimal"
              accessibilityLabel={`${product.name} ${t('basket.quantity')}`}
            />

            <Pressable
              onPress={() => setQuantity(product.id, quantity + STEP)}
              hitSlop={8}
              style={({ pressed }) => [styles.stepBtn, pressed && styles.stepPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${product.name} ${t('basket.increase')}`}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      );
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('basket.title')}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.stepPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {products.length > 0 ? (
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder={t('products.search')}
              accessibilityLabel={t('products.search')}
            />
          ) : null}

          {/* Kategoriya chiplari — faqat bir nechta guruh bo'lsa chiqadi. */}
          {categoryOptions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              keyboardShouldPersistTaps="handled"
            >
              {[{ id: ALL_CATEGORIES, name: t('products.allCategories') }, ...categoryOptions].map((option) => {
                const active = category === option.id;
                return (
                  <Pressable
                    key={option.id || 'all'}
                    onPress={() => setCategory(option.id)}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.chipPressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel={option.name}
                    accessibilityState={{ checked: active }}
                    hitSlop={4}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                      {option.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {renderBody()}
          </ScrollView>

          {mixedCurrency ? <Text style={styles.error}>{t('basket.mixedCurrency')}</Text> : null}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {t('basket.selected', { count: selected.length })}
            </Text>
            <Text style={styles.totalValue}>
              {basketCurrency ? formatMoney(total, basketCurrency) : '--'}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button title={t('common.cancel')} variant="secondary" onPress={onClose} style={styles.actionBtn} />
            <Button
              title={t('basket.apply')}
              onPress={handleConfirm}
              disabled={selected.length === 0 || mixedCurrency}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
      ...glass.scrim,
    },
    card: {
      ...modalCardLayout,
      ...glass.modal,
      borderRadius: radius.lg,
      padding: spacing.md,
      // Modal ekrandan chiqib ketmasin: ro'yxat ichkarida aylanadi.
      maxHeight: '100%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    closeBtn: {
      padding: spacing.xxs,
    },
    list: {
      marginTop: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xxs,
      borderRadius: radius.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    // Savatga tushgan qator ajralib tursin — uzun ro'yxatda tanlanganini
    // topish uchun pastga qarab yugurmaslik kerak.
    rowActive: {
      backgroundColor: colors.primarySoft,
    },
    info: {
      flex: 1,
      // minWidth: 0 bo'lmasa flex qatorda matn qisqarmaydi — uzun nom
      // qo'shnisini siqib chiqaradi.
      minWidth: 0,
    },
    name: {
      ...typography.bodySmall,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      marginTop: spacing.xxs / 2,
      fontSize: 12,
      color: colors.textSecondary,
    },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: spacing.xs,
    },
    chip: {
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      maxWidth: 160,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    chipPressed: {
      opacity: 0.7,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.primary,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      // Miqdor bloki qisqarmaydi; joy kamayganda nom qisqaradi.
      flexShrink: 0,
    },
    stepBtn: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    stepPressed: {
      opacity: 0.6,
    },
    stepDisabled: {
      backgroundColor: colors.surfaceMuted,
    },
    qtyInput: {
      // DIQQAT: minWidth emas, aniq width. Webda TextInput oddiy <input>
      // bo'lib chiqadi va brauzer unga ~170px tug'ma kenglik beradi —
      // minWidth uni cheklamaydi, natijada miqdor katagi butun qatorni
      // egallab, mahsulot nomi va narxi siqilib qolgan edi.
      width: 46,
      flexGrow: 0,
      flexShrink: 0,
      textAlign: 'center',
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.xxs,
      borderRadius: radius.sm,
      backgroundColor: colors.gray50,
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    error: {
      ...typography.caption,
      marginTop: spacing.xs,
      color: colors.negative,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
    },
    totalLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    totalValue: {
      ...typography.body,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
  });

export default ProductBasketModal;
