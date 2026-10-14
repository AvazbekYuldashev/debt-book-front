import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../../../shared/ui/AppModal';
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import SearchField from '../../../shared/ui/SearchField';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { formatMoney } from '../../../shared/lib/money';
import { formatQuantity } from '../../../shared/lib/quantity';
import { freeQuantity, itemsForPeriod, rentalItemCategories } from '../model/rentalStock';
import { perPeriodLabel } from '../model/rentalLabels';
import type { RentalPeriod } from '../types/rental';
import type { RentalItemResponseDTO } from '../types/rentalItem';

/** Tanlangan buyum: qaysi va nechta. */
export interface RentalPick {
  itemId: string;
  quantity: number;
}

interface RentalItemBasketModalProps {
  visible: boolean;
  items: RentalItemResponseDTO[];
  /** Kunlik va soatlik buyum bitta ijarada aralashmaydi. */
  period: RentalPeriod;
  /** Formada allaqachon turgan qatorlar. */
  initial?: RentalPick[];
  onClose: () => void;
  onConfirm: (picks: RentalPick[]) => void;
}

const ALL = '';
/** Bitta bosishda o'zgaradigan miqdor. Kasr kerak bo'lsa maydonga yoziladi. */
const STEP = 1;

/**
 * Ombordan buyum tanlash — narxnoma savati bilan BIR XIL ko'rinishda.
 *
 * Ilgari buyumlar ijara formasining ichida tekis ro'yxat bo'lib turardi:
 * forma cho'zilib ketar, kategoriya ko'rinmas, buyum ko'p bo'lsa kerakli
 * narsani qidirib topish qiyin edi. Endi forma qisqa qoladi va tanlash
 * o'z oynasida bo'ladi — odam "Narxnomadan tanlash" oqimini allaqachon
 * biladi, bu esa aynan o'sha.
 *
 * Miqdor shu yerda belgilanadi, NARX esa formada qoladi: chegirma
 * egasining ishi va u har buyumga alohida yozilishi mumkin.
 *
 * Bo'sh sonidan oshirib bo'lmaydi — ombor qancha bo'lsa, shuncha.
 */
const RentalItemBasketModal: React.FC<RentalItemBasketModalProps> = ({
  visible,
  items,
  period,
  initial,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(ALL);
  // itemId -> miqdor (matn: foydalanuvchi 1.5 kabi kasr yozishi mumkin).
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setCategory(ALL);
    // Oyna FORMADAGI holat bilan ochiladi, noldan emas — aks holda
    // tanlangan qatorlarni tuzatmoqchi bo'lgan odam hammasini
    // boshqatdan yig'ishga majbur bo'lardi.
    const seeded: Record<string, string> = {};
    for (const pick of initial ?? []) {
      if (pick.quantity > 0) seeded[pick.itemId] = formatQuantity(pick.quantity);
    }
    setQuantities(seeded);
  }, [visible, initial]);

  /** Faqat shu davrdagi buyumlar: kunlik va soatlik aralashmaydi. */
  const periodItems = useMemo(() => itemsForPeriod(items, period), [items, period]);
  const categories = useMemo(() => rentalItemCategories(periodItems), [periodItems]);

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return periodItems.filter((item) => {
      // Kategoriya qidiruvdan OLDIN: tanlangan bo'limdan tashqaridagi
      // buyum qidiruvda ham chiqmasligi kerak.
      if (category !== ALL && (item.category ?? '') !== category) return false;
      if (!needle) return true;
      return item.name.toLowerCase().includes(needle);
    });
  }, [periodItems, search, category]);

  const readQuantity = useCallback(
    (id: string): number => {
      const raw = quantities[id];
      if (!raw) return 0;
      const parsed = Number(raw.replace(',', '.'));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    },
    [quantities],
  );

  const setQuantity = useCallback(
    (item: RentalItemResponseDTO, next: number) => {
      // Ombordagidan ko'p berib bo'lmaydi — server ham rad etadi.
      const capped = Math.min(next, freeQuantity(item));
      setQuantities((prev) => {
        const copy = { ...prev };
        if (capped <= 0) delete copy[item.id];
        else copy[item.id] = formatQuantity(capped);
        return copy;
      });
    },
    [],
  );

  const selected = useMemo(
    () => periodItems.filter((item) => readQuantity(item.id) > 0),
    [periodItems, readQuantity],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(selected.map((item) => ({ itemId: item.id, quantity: readQuantity(item.id) })));
  }, [selected, readQuantity, onConfirm]);

  const renderBody = () => {
    if (periodItems.length === 0) {
      return <EmptyState icon="cube-outline" title={t('rentals.stockEmptyForPeriod')} />;
    }
    if (visibleItems.length === 0) {
      return <EmptyState icon="search-outline" title={t('products.notFound')} />;
    }

    return visibleItems.map((item) => {
      const quantity = readQuantity(item.id);
      const free = freeQuantity(item);
      const full = quantity >= free;
      return (
        <View key={item.id} style={[styles.row, quantity > 0 && styles.rowActive]}>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {`${formatMoney(item.price, item.currency)} ${perPeriodLabel(t, item.period)}`}
            </Text>
            <Text
              style={[styles.free, { color: free > 0 ? colors.positive : colors.negative }]}
              numberOfLines={1}
            >
              {t('rentals.freeCount', { count: formatQuantity(free) })}
            </Text>
          </View>

          <View style={styles.stepper}>
            <Pressable
              onPress={() => setQuantity(item, quantity - STEP)}
              disabled={quantity <= 0}
              hitSlop={8}
              style={({ pressed }) => [
                styles.stepBtn,
                pressed && styles.pressed,
                quantity <= 0 && styles.stepDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} ${t('basket.decrease')}`}
            >
              <Ionicons
                name="remove"
                size={16}
                color={quantity <= 0 ? colors.textSecondary : colors.primary}
              />
            </Pressable>

            {/* Matn maydoni: "1.5 m²" kabi kasr miqdorni tugma bilan emas,
                yozib kiritish kerak bo'ladi. */}
            <TextInput
              style={styles.qtyInput}
              value={quantities[item.id] ?? ''}
              onChangeText={(value) =>
                setQuantities((prev) => ({ ...prev, [item.id]: value.replace(/[^\d.,]/g, '') }))
              }
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              inputMode="decimal"
              accessibilityLabel={`${item.name} ${t('basket.quantity')}`}
            />

            <Pressable
              onPress={() => setQuantity(item, quantity + STEP)}
              disabled={full}
              hitSlop={8}
              style={({ pressed }) => [
                styles.stepBtn,
                pressed && styles.pressed,
                full && styles.stepDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} ${t('basket.increase')}`}
            >
              <Ionicons name="add" size={16} color={full ? colors.textSecondary : colors.primary} />
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
            <Text style={styles.title}>{t('rentals.basketTitle')}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {periodItems.length > 0 ? (
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder={t('rentals.searchItem')}
              accessibilityLabel={t('rentals.searchItem')}
            />
          ) : null}

          {/* Kategoriya chiplari — faqat guruh bo'lsa chiqadi. */}
          {categories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              keyboardShouldPersistTaps="handled"
            >
              {[ALL, ...categories].map((option) => {
                const active = category === option;
                const label = option === ALL ? t('products.allCategories') : option;
                return (
                  <Pressable
                    key={option || 'all'}
                    onPress={() => setCategory(option)}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: active }}
                    hitSlop={4}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderBody()}
          </ScrollView>

          <Text style={styles.selectedText}>
            {t('rentals.basketSelected', { count: String(selected.length) })}
          </Text>

          <View style={styles.actions}>
            <Button
              title={t('common.cancel')}
              variant="secondary"
              onPress={onClose}
              style={styles.actionBtn}
            />
            <Button
              title={t('rentals.basketApply')}
              onPress={handleConfirm}
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
      ...glass.scrim,
    },
    card: {
      ...modalCardLayout,
      ...glass.modal,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    closeBtn: { padding: spacing.xxs },
    pressed: { opacity: 0.6 },
    chipRow: {
      gap: spacing.xs,
      paddingVertical: 2,
    },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs + 2,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.textOnPrimary,
      fontWeight: '700',
    },
    list: { flexGrow: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
    },
    // Tanlangan qator ajralib turadi: uzun ro'yxatda nima olinganini
    // pastga tushmasdan ko'rish kerak.
    rowActive: { backgroundColor: colors.surfaceMuted },
    info: { flex: 1, minWidth: 0 },
    name: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    free: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    stepBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    stepDisabled: { opacity: 0.4 },
    qtyInput: {
      ...typography.body,
      minWidth: 44,
      textAlign: 'center',
      color: colors.textPrimary,
      paddingVertical: 2,
    },
    selectedText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: { flex: 1 },
  });

export default RentalItemBasketModal;
