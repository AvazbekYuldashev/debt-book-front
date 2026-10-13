import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Modal from '../../../shared/ui/AppModal';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import ChipSelector, { type ChipOption } from '../../../shared/ui/ChipSelector';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';
import { CURRENCIES, type Currency } from '../../../shared/types/money';
import { CURRENCY_LABEL } from '../../../shared/lib/currency';
import { formatAmountInput, parseAmountInput } from '../../../shared/lib/money';
import { formatQuantity } from '../../../shared/lib/quantity';
import { useCurrency } from '../../debts/context/CurrencyContext';
import type { ProductUnit } from '../../products/types/product';
import { useCreateRentalItem, useUpdateRentalItem } from '../hooks/useRentals';
import { busyQuantity } from '../model/rentalStock';
import { periodLabel } from '../model/rentalLabels';
import { RENTAL_PERIODS, type RentalPeriod } from '../types/rental';
import type { RentalItemResponseDTO } from '../types/rentalItem';

interface RentalItemFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Berilsa tahrirlash rejimi. */
  item?: RentalItemResponseDTO | null;
  /** Ombordagi mavjud guruhlar — bir bosishda tanlash uchun. */
  categories?: string[];
}

/**
 * Ijarada ishlatiladigan o'lchov birliklari.
 *
 * Narxnomadagi to'liq ro'yxat (litr, porsiya, xizmat...) bu yerda ma'nosiz:
 * ijarachi buyumni dona (arava, stul), m² (opalubka) yoki metr bilan sanaydi.
 */
const RENTAL_UNITS: readonly ProductUnit[] = ['DONA', 'METR_KVADRAT', 'METR', 'KG', 'QUTI'];

/**
 * Omborga buyum qo'shish / tahrirlash.
 *
 * Eng muhim ikki maydon — JAMI SONI va NARX DAVRI (kunlik yoki soatlik):
 * ijaraga berishda bo'sh soni va summa aynan shulardan hisoblanadi.
 * Qolgani (guruh, birlik, izoh) ixtiyoriy va odatiy qiymat bilan keladi.
 */
const RentalItemFormModal: React.FC<RentalItemFormModalProps> = ({
  visible,
  onClose,
  item,
  categories = [],
}) => {
  const theme = useAppTheme();
  const keyboardInset = useKeyboardInset();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { baseCurrency } = useCurrency();
  const createMutation = useCreateRentalItem();
  const updateMutation = useUpdateRentalItem();
  const isEdit = Boolean(item);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [period, setPeriod] = useState<RentalPeriod>('DAY');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [unit, setUnit] = useState<ProductUnit>('DONA');
  const [total, setTotal] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    if (item) {
      setName(item.name);
      setCategory(item.category ?? '');
      setPeriod(item.period);
      setPrice(formatAmountInput(String(item.price)));
      setCurrency(item.currency ?? baseCurrency);
      setUnit(item.unit && RENTAL_UNITS.includes(item.unit) ? item.unit : 'DONA');
      setTotal(formatQuantity(item.totalQuantity));
      setNote(item.note ?? '');
      return;
    }
    setName('');
    setCategory('');
    setPeriod('DAY');
    setPrice('');
    setCurrency(baseCurrency);
    setUnit('DONA');
    setTotal('');
    setNote('');
  }, [visible, item, baseCurrency]);

  const periodOptions = useMemo<ChipOption<RentalPeriod>[]>(
    () => RENTAL_PERIODS.map((value) => ({ value, label: periodLabel(t, value) })),
    [t],
  );

  const currencyOptions = useMemo<ChipOption<Currency>[]>(
    () => CURRENCIES.map((code) => ({ value: code, label: CURRENCY_LABEL[code] })),
    [],
  );

  const unitOptions = useMemo<ChipOption<ProductUnit>[]>(
    () => RENTAL_UNITS.map((value) => ({ value, label: t(`products.unit.${value}`) })),
    [t],
  );

  // Tanlangan guruh takliflar ichida ko'rinib tursin — yozib bo'lingach ham.
  const categoryChips = useMemo(
    () => categories.filter((value) => value.toLowerCase() !== category.trim().toLowerCase()).slice(0, 8),
    [categories, category],
  );

  const handleSubmit = useCallback(() => {
    setError('');
    if (!name.trim()) return setError(t('rentals.errItemName'));

    const totalNumber = Number(total.replace(',', '.'));
    if (!Number.isFinite(totalNumber) || totalNumber <= 0) return setError(t('rentals.errItemTotal'));

    // Jami mijozlardagidan kam bo'lsa bo'sh soni manfiy bo'lib qolardi.
    if (item && totalNumber < busyQuantity(item)) {
      return setError(t('rentals.errItemTotalBelowBusy', { busy: formatQuantity(busyQuantity(item)) }));
    }

    const priceNumber = parseAmountInput(price);
    if (!priceNumber) return setError(t('rentals.errItemPrice'));

    const payload = {
      name: name.trim(),
      category: category.trim() || undefined,
      period,
      price: priceNumber,
      currency,
      unit,
      totalQuantity: totalNumber,
      note: note.trim() || undefined,
    };

    const handlers = {
      onSuccess: onClose,
      onError: (err: unknown) => setError((err as Error).message),
    };

    if (item) {
      updateMutation.mutate({ id: item.id, ...payload }, handlers);
      return;
    }
    createMutation.mutate(payload, handlers);
  }, [name, total, item, price, category, period, currency, unit, note, createMutation, updateMutation, onClose, t]);

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: theme.spacing.lg + keyboardInset },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">
              {isEdit ? t('rentals.itemEditTitle') : t('rentals.itemCreateTitle')}
            </Text>

            <Input
              label={t('rentals.itemName')}
              value={name}
              onChangeText={setName}
              placeholder={t('rentals.itemNamePlaceholder')}
            />

            <View style={styles.block}>
              <Input
                label={t('rentals.itemCategory')}
                value={category}
                onChangeText={setCategory}
                placeholder={t('rentals.itemCategoryPlaceholder')}
              />
              {categoryChips.length > 0 ? (
                <View style={styles.suggestions}>
                  {categoryChips.map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setCategory(value)}
                      style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={value}
                    >
                      <Text style={styles.suggestionText} numberOfLines={1}>
                        {value}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <ChipSelector
              options={periodOptions}
              value={period}
              onChange={setPeriod}
              label={t('rentals.itemPeriod')}
              layout="fluid"
            />

            <View style={styles.pairRow}>
              <Input
                label={t('rentals.itemTotal')}
                value={total}
                onChangeText={(value) => setTotal(value.replace(/[^\d.,]/g, '').slice(0, 9))}
                keyboardType="decimal-pad"
                containerStyle={styles.pairItem}
              />
              <Input
                label={t(period === 'HOUR' ? 'rentals.itemPriceHour' : 'rentals.itemPriceDay')}
                value={price}
                onChangeText={(value) => setPrice(formatAmountInput(value))}
                keyboardType="decimal-pad"
                containerStyle={styles.pairItem}
              />
            </View>

            <ChipSelector
              options={unitOptions}
              value={unit}
              onChange={setUnit}
              label={t('rentals.itemUnit')}
            />

            <ChipSelector
              options={currencyOptions}
              value={currency}
              onChange={setCurrency}
              label={t('money.currency')}
            />

            <Input label={t('rentals.fieldNote')} value={note} onChangeText={setNote} />

            {item ? (
              <Text style={styles.note}>
                {t('rentals.itemBusyNote', {
                  busy: formatQuantity(busyQuantity(item)),
                  unit: t(`products.unit.${unit}`),
                })}
              </Text>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={onClose}
                style={styles.actionBtn}
              />
              <Button
                title={t('common.save')}
                onPress={handleSubmit}
                loading={pending}
                style={styles.actionBtn}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      ...glass.scrim,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    card: {
      ...modalCardLayout,
      ...glass.modal,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    block: {
      gap: spacing.xs,
    },
    suggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    suggestion: {
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    suggestionPressed: {
      backgroundColor: colors.primarySoft,
    },
    suggestionText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    pairRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    pairItem: {
      flex: 1,
    },
    note: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
  });

export default RentalItemFormModal;
