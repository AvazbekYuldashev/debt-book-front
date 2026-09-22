import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import ChipSelector from '../../../shared/ui/ChipSelector';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';
import { CURRENCIES, CURRENCY_LABEL, normalizeCurrency } from '../../../shared/lib/currency';
import { formatAmountInput } from '../../../shared/lib/money';
import type { Currency } from '../../../shared/types/money';
import {
  DEFAULT_PRODUCT_UNIT,
  PRODUCT_UNITS,
  normalizeProductUnit,
  type ProductResponseDTO,
  type ProductUnit,
} from '../types/product';

type Mode = 'create' | 'edit';

export interface ProductFormValues {
  name: string;
  code: string;
  price: number;
  currency: Currency;
  unit: ProductUnit;
  description: string;
  /** Bo'sh satr = kategoriyasiz. */
  categoryId: string;
}

interface ProductFormModalProps {
  visible: boolean;
  mode: Mode;
  /** Tahrirlashda - hozirgi mahsulot; yaratishda undefined. */
  initial?: ProductResponseDTO | null;
  submitting: boolean;
  /** Tanlash uchun narxnoma kategoriyalari (bo'sh bo'lsa tanlagich chiqmaydi). */
  categories?: ReadonlyArray<{ id: string; name: string }>;
  /**
   * Yangi mahsulot uchun oldindan tanlangan kategoriya.
   *
   * Ro'yxat qaysi kategoriya bo'yicha filtrlangan bo'lsa, "+" bosilganda
   * o'shanisi qo'yiladi: odam "Ichimliklar"ni ochib turib yangi mahsulot
   * qo'shsa, uni yana qo'lda "Ichimliklar" deb belgilashi ortiqcha.
   * Tahrirlashda ishlatilmaydi — u yerda mahsulotning o'z kategoriyasi bor.
   */
  defaultCategoryId?: string;
  onClose: () => void;
  /** `true` qaytsa modal yopiladi; `false` - xato ekranda qoladi. */
  onSubmit: (values: ProductFormValues) => Promise<boolean>;
}

/**
 * Narxni matndan songa o'giradi.
 *
 * `parseAmountInput` dan farqi - NOL ruxsat etiladi: "hozircha narxi yo'q"
 * yoki "aksiya: bepul" holatlari narxnomada uchraydi, backend ham 0 ni
 * qabul qiladi (DecimalMin = 0.00).
 */
const parsePrice = (raw: string): number | null => {
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

/** Mahsulot qo'shish/tahrirlash modali. */
const ProductFormModal: React.FC<ProductFormModalProps> = ({
  visible,
  mode,
  initial,
  submitting,
  categories,
  defaultCategoryId,
  onClose,
  onSubmit,
}) => {
  const theme = useAppTheme();
  const keyboardInset = useKeyboardInset();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<Currency>('UZS');
  const [unit, setUnit] = useState<ProductUnit>(DEFAULT_PRODUCT_UNIT);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!visible) return;
    const editing = mode === 'edit' ? initial : null;
    setName(editing?.name ?? '');
    setCode(editing?.code ?? '');
    setPrice(editing ? formatAmountInput(String(editing.price ?? '')) : '');
    setCurrency(normalizeCurrency(editing?.currency));
    setUnit(normalizeProductUnit(editing?.unit));
    setDescription(editing?.description ?? '');
    // Yaratishda — filtrdagi kategoriya; tahrirlashda — mahsulotning o'zi.
    setCategoryId((mode === 'edit' ? editing?.categoryId : defaultCategoryId) ?? '');
    setLocalError('');
  }, [visible, mode, initial, defaultCategoryId]);

  const currencyOptions = useMemo(
    () => CURRENCIES.map((value) => ({ value, label: CURRENCY_LABEL[value] })),
    []
  );

  const unitOptions = useMemo(
    () => PRODUCT_UNITS.map((value) => ({ value, label: t(`products.unit.${value}`) })),
    [t]
  );

  // Birinchi variant HAR DOIM "kategoriyasiz": kategoriya majburiy emas va
  // uni tanlamaslik ham ongli tanlov bo'lishi kerak.
  const categoryOptions = useMemo(
    () => [
      { value: '', label: t('products.noCategory') },
      ...(categories ?? []).map((category) => ({ value: category.id, label: category.name })),
    ],
    [categories, t]
  );

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setLocalError(t('products.enterName'));
      return;
    }
    const parsedPrice = parsePrice(price);
    if (parsedPrice === null) {
      setLocalError(t('products.enterPrice'));
      return;
    }
    setLocalError('');
    const ok = await onSubmit({
      name: name.trim(),
      code: code.trim(),
      price: parsedPrice,
      currency,
      unit,
      description: description.trim(),
      categoryId,
    });
    if (ok) onClose();
  }, [name, price, code, currency, unit, description, categoryId, t, onSubmit, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: theme.spacing.lg + keyboardInset },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>{mode === 'create' ? t('products.add') : t('products.edit')}</Text>

            <Input
              label={t('products.name')}
              value={name}
              onChangeText={setName}
              placeholder={t('products.namePlaceholder')}
              autoFocus
            />

            <Input
              label={t('products.price')}
              value={price}
              // Formatlash kiritish paytida: "12000" -> "12 000", kasr qismi saqlanadi.
              onChangeText={(next) => setPrice(formatAmountInput(next))}
              placeholder="0"
              keyboardType="decimal-pad"
              inputMode="decimal"
            />

            {categories && categories.length > 0 ? (
              <ChipSelector
                label={t('products.category')}
                options={categoryOptions}
                value={categoryId}
                onChange={setCategoryId}
                layout="scroll"
                style={styles.selector}
              />
            ) : null}

            <ChipSelector
              label={t('products.currency')}
              options={currencyOptions}
              value={currency}
              onChange={setCurrency}
              layout="fluid"
              style={styles.selector}
            />

            <ChipSelector
              label={t('products.unit')}
              options={unitOptions}
              value={unit}
              onChange={setUnit}
              layout="wrap"
              style={styles.selector}
            />

            <Input
              label={t('products.code')}
              value={code}
              onChangeText={setCode}
              placeholder={t('products.codePlaceholder')}
              autoCapitalize="characters"
            />

            <Input
              label={t('products.description')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('products.descriptionPlaceholder')}
            />

            {localError ? <Text style={styles.error}>{localError}</Text> : null}

            <View style={styles.actions}>
              <Button title={t('common.cancel')} variant="secondary" onPress={onClose} style={styles.actionBtn} />
              <Button
                title={mode === 'create' ? t('common.add') : t('common.save')}
                onPress={handleSubmit}
                loading={submitting}
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
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    selector: {
      marginBottom: spacing.md,
    },
    error: {
      ...typography.caption,
      color: colors.negative,
      marginBottom: spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
  });

export default ProductFormModal;
