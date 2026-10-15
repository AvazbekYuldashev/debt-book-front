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
import { periodLabel, perPeriodLabel } from '../model/rentalLabels';
import type { RentalPeriod } from '../types/rental';
import type { RentalItemResponseDTO } from '../types/rentalItem';

/** Tanlangan buyum: qaysi, nechta va necha muddatga. */
export interface RentalPick {
  itemId: string;
  quantity: number;
  /**
   * Necha kun (yoki soat). null = muddat kelishilmagan.
   *
   * HAR BUYUMGA ALOHIDA: bir odam lesani o'n kunga, mikserni bir kunga
   * olishi mumkin. Umumiy muddat bo'lsa ikkinchisini alohida yozuv
   * qilib yurishga majbur bo'lardi.
   */
  duration: number | null;
}

interface RentalItemBasketModalProps {
  visible: boolean;
  items: RentalItemResponseDTO[];
  /**
   * Kunlik va soatlik buyum bitta ijarada aralashmaydi.
   *
   * Berilmasa HAMMASI ko'rsatiladi: mijoz davrni oldindan bilmaydi,
   * u buyumni tanlaydi va davr o'sha buyumdan chiqadi. Aralashtirib
   * yuborilsa chaqiruvchi tomon xatoni aytadi.
   */
  period?: RentalPeriod;
  /** Formada allaqachon turgan qatorlar. */
  initial?: RentalPick[];
  /**
   * Har buyumga MUDDAT ham so'ralsinmi.
   *
   * Mijoz tomonida ha: bir odam lesani o'n kunga, mikserni bir kunga
   * olishi mumkin. Ombor egasining formasida esa muddat bitta - u
   * bir mijozga bir martada beradi va muddatni o'sha yerda yozadi.
   */
  askDuration?: boolean;
  /**
   * Shu oqimda ALLAQACHON tanlangan miqdorlar (itemId -> soni).
   *
   * Bo'sh sonidan ayriladi: odam "2 ta lesa" ni tanlab, qaytib kirib
   * yana "4 ta" ola olmasligi kerak - omborda jami 4 ta bor.
   */
  reserved?: Record<string, number>;
  onClose: () => void;
  onConfirm: (picks: RentalPick[]) => void;
}

const ALL = '';
/** Har render'da bir xil bo'sh havola — keraksiz effekt qo'zg'atmaslik uchun. */
const EMPTY_RESERVED: Record<string, number> = {};
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
  askDuration = false,
  reserved = EMPTY_RESERVED,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(ALL);
  // itemId -> miqdor va muddat (matn: kasr miqdor yozilishi mumkin).
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [durations, setDurations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setCategory(ALL);
    // Oyna FORMADAGI holat bilan ochiladi, noldan emas — aks holda
    // tanlangan qatorlarni tuzatmoqchi bo'lgan odam hammasini
    // boshqatdan yig'ishga majbur bo'lardi.
    const seeded: Record<string, string> = {};
    const seededDuration: Record<string, string> = {};
    for (const pick of initial ?? []) {
      if (pick.quantity <= 0) continue;
      seeded[pick.itemId] = formatQuantity(pick.quantity);
      if (pick.duration != null) seededDuration[pick.itemId] = String(pick.duration);
    }
    setQuantities(seeded);
    setDurations(seededDuration);
  }, [visible, initial]);

  /** Faqat shu davrdagi buyumlar: kunlik va soatlik aralashmaydi. */
  const periodItems = useMemo(
    () => (period ? itemsForPeriod(items, period) : items),
    [items, period],
  );
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

  /** Bo'sh soni: ombordagidan shu oqimda tanlangani ayriladi. */
  const freeOf = useCallback(
    (stockItem: RentalItemResponseDTO) =>
      Math.max(0, freeQuantity(stockItem) - (reserved[stockItem.id] ?? 0)),
    [reserved],
  );

  const setQuantity = useCallback(
    (item: RentalItemResponseDTO, next: number) => {
      // Ombordagidan ko'p berib bo'lmaydi — server ham rad etadi.
      const capped = Math.min(next, freeOf(item));
      setQuantities((prev) => {
        const copy = { ...prev };
        if (capped <= 0) delete copy[item.id];
        else copy[item.id] = formatQuantity(capped);
        return copy;
      });
    },
    [freeOf],
  );

  const readDuration = useCallback(
    (id: string): number | null => {
      const raw = durations[id];
      if (!raw) return null;
      const parsed = Math.floor(Number(raw));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    },
    [durations],
  );

  /** Muddat bo'sh qolsa ijara MUDDATSIZ bo'ladi — nol emas. */
  const setDuration = useCallback((id: string, next: number) => {
    setDurations((prev) => {
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = String(Math.floor(next));
      return copy;
    });
  }, []);

  const selected = useMemo(
    () => periodItems.filter((item) => readQuantity(item.id) > 0),
    [periodItems, readQuantity],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(
      selected.map((item) => ({
        itemId: item.id,
        quantity: readQuantity(item.id),
        duration: readDuration(item.id),
      })),
    );
  }, [selected, readQuantity, readDuration, onConfirm]);

  const renderBody = () => {
    if (periodItems.length === 0) {
      return <EmptyState icon="cube-outline" title={t('rentals.stockEmptyForPeriod')} />;
    }
    if (visibleItems.length === 0) {
      return <EmptyState icon="search-outline" title={t('products.notFound')} />;
    }

    return visibleItems.map((item) => {
      const quantity = readQuantity(item.id);
      const days = readDuration(item.id);
      const free = freeOf(item);
      const full = quantity >= free;

      /** Bitta stepper: "− qiymat +". Ikkisi ham bir xil ko'rinishda. */
      const stepper = (
        label: string,
        value: string,
        onMinus: () => void,
        onPlus: () => void,
        onType: (next: string) => void,
        plusDisabled = false,
      ) => (
        <View style={styles.stepper}>
          <Pressable
            onPress={onMinus}
            disabled={!value}
            hitSlop={8}
            style={({ pressed }) => [
              styles.stepBtn,
              pressed && styles.pressed,
              !value && styles.stepDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} ${label} ${t('basket.decrease')}`}
          >
            <Ionicons name="remove" size={16} color={value ? colors.primary : colors.textSecondary} />
          </Pressable>

          {/* Matn maydoni: kasr miqdorni ("1.5 m²") tugma bilan emas,
              yozib kiritish kerak bo'ladi. */}
          <TextInput
            style={styles.qtyInput}
            value={value}
            onChangeText={onType}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            inputMode="decimal"
            accessibilityLabel={`${item.name} ${label}`}
          />

          <Pressable
            onPress={onPlus}
            disabled={plusDisabled}
            hitSlop={8}
            style={({ pressed }) => [
              styles.stepBtn,
              pressed && styles.pressed,
              plusDisabled && styles.stepDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} ${label} ${t('basket.increase')}`}
          >
            <Ionicons
              name="add"
              size={16}
              color={plusDisabled ? colors.textSecondary : colors.primary}
            />
          </Pressable>
        </View>
      );

      return (
        <View key={item.id} style={[styles.row, quantity > 0 && styles.rowActive]}>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {`${formatMoney(item.price, item.currency)} ${perPeriodLabel(t, item.period)}`}
              {' · '}
              <Text style={{ color: free > 0 ? colors.positive : colors.negative }}>
                {t('rentals.freeCount', { count: formatQuantity(free) })}
              </Text>
            </Text>
          </View>

          {/*
            IKKI stepper: nechta va necha muddatga.

            Muddat HAR BUYUMGA alohida - bir odam lesani o'n kunga,
            mikserni bir kunga olishi mumkin. Bo'sh qoldirilsa ijara
            muddatsiz bo'ladi.
          */}
          <View style={styles.steppers}>
            <View style={styles.stepperCell}>
              <Text style={styles.stepperLabel}>{t('rentals.fieldQuantity')}</Text>
              {stepper(
                t('basket.quantity'),
                quantities[item.id] ?? '',
                () => setQuantity(item, quantity - STEP),
                () => setQuantity(item, quantity + STEP),
                (next) =>
                  setQuantities((prev) => ({ ...prev, [item.id]: next.replace(/[^\d.,]/g, '') })),
                full,
              )}
            </View>

            {askDuration ? (
            <View style={styles.stepperCell}>
              <Text style={styles.stepperLabel}>{periodLabel(t, item.period)}</Text>
              {stepper(
                periodLabel(t, item.period),
                durations[item.id] ?? '',
                () => setDuration(item.id, (days ?? 0) - STEP),
                () => setDuration(item.id, (days ?? 0) + STEP),
                (next) =>
                  setDurations((prev) => ({ ...prev, [item.id]: next.replace(/\D/g, '') })),
              )}
            </View>
            ) : null}
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
    // Qator ikki qavat: tepada nomi, pastda ikkita stepper.
    row: {
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
    },
    steppers: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    stepperCell: {
      flex: 1,
      gap: 2,
    },
    stepperLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
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
