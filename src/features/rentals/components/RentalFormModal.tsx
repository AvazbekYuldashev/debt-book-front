import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../../../shared/ui/AppModal';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import ChipSelector, { type ChipOption } from '../../../shared/ui/ChipSelector';
import SearchField from '../../../shared/ui/SearchField';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';
import { CURRENCIES, type Currency } from '../../../shared/types/money';
import { CURRENCY_LABEL, CURRENCY_SYMBOL } from '../../../shared/lib/currency';
import { formatAmountInput, formatMoney, parseAmountInput } from '../../../shared/lib/money';
import { formatDateInputValue, isValidDateInput } from '../../../shared/lib/date';
import { ContactsContext, type Contact } from '../../debts/context/ContactsContext';
import { useCurrency } from '../../debts/context/CurrencyContext';
import { useCreateRental, useUpdateRental } from '../hooks/useRentals';
import { daysFromDueDate, dueDateFrom, todayString } from '../model/rentalMath';
import type { RentalResponseDTO } from '../types/rental';

interface RentalFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Mijoz oldindan ma'lum bo'lsa (mijoz ekranidan ochilgan) — tanlash so'ralmaydi. */
  client?: { id: string; name: string } | null;
  /** Berilsa tahrirlash rejimi. */
  rental?: RentalResponseDTO | null;
}

/** Ro'yxatda ko'rinadigan mijozlar soni — undan ortig'ini qidiruv bilan topadi. */
const CONTACT_LIMIT = 6;

/**
 * Ijara ochish / tahrirlash formasi.
 *
 * Forma KUN SONINI so'raydi, muddat sanasini emas: "nechta kunga berdim"
 * degan savol odamga tabiiy, sanani esa dastur o'zi chiqaradi va darhol
 * ko'rsatib turadi — shunda noto'g'ri kun yozilsa ko'zga tashlanadi.
 *
 * Pastdagi hisob satri ATAYIN bor: summa kunlik narxdan ko'paytirilgani
 * uchun odam saqlashdan OLDIN "3 kun × 50 000 = 150 000" ni ko'rib
 * tasdiqlashi kerak. Aks holda ortiqcha nol yozilgani keyin bilinardi.
 */
const RentalFormModal: React.FC<RentalFormModalProps> = ({ visible, onClose, client, rental }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const keyboardInset = useKeyboardInset();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { contacts } = useContext(ContactsContext);
  const { baseCurrency } = useCurrency();
  const createMutation = useCreateRental();
  const updateMutation = useUpdateRental();
  const isEdit = Boolean(rental);

  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [dailyPrice, setDailyPrice] = useState('');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [startDate, setStartDate] = useState(todayString());
  const [days, setDays] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Oyna har ochilganda toza forma (yoki tahrirlanayotgan yozuv qiymatlari).
  useEffect(() => {
    if (!visible) return;
    setError('');
    setContactSearch('');
    if (rental) {
      setSelected({ id: rental.clientId, name: rental.clientName });
      setItemName(rental.itemName);
      setQuantity(String(rental.quantity || 1));
      setDailyPrice(formatAmountInput(String(rental.dailyPrice)));
      setCurrency(rental.currency ?? baseCurrency);
      setStartDate(rental.startDate);
      setDays(String(daysFromDueDate(rental.startDate, rental.dueDate) ?? ''));
      setNote(rental.note ?? '');
      return;
    }
    setSelected(client ?? null);
    setItemName('');
    setQuantity('1');
    setDailyPrice('');
    setCurrency(baseCurrency);
    setStartDate(todayString());
    setDays('');
    setNote('');
  }, [visible, rental, client, baseCurrency]);

  const currencyOptions = useMemo<ChipOption<Currency>[]>(
    () =>
      CURRENCIES.map((code) => {
        const label = CURRENCY_LABEL[code];
        const symbol = CURRENCY_SYMBOL[code];
        // "So'm (so'm)" kabi takror bo'lmasin — belgi nomdan farq qilsagina qavsda.
        return {
          value: code,
          label: label.toLowerCase() === symbol.toLowerCase() ? label : `${label} (${symbol})`,
        };
      }),
    [],
  );

  const visibleContacts = useMemo(() => {
    const needle = contactSearch.trim().toLowerCase();
    const list = needle
      ? contacts.filter(
          (item) =>
            item.fullName.toLowerCase().includes(needle) || (item.phone ?? '').includes(needle),
        )
      : contacts;
    return list.slice(0, CONTACT_LIMIT);
  }, [contacts, contactSearch]);

  // ---- Hisob satri: forma to'ldirilgani sayin yangilanadi ----

  const priceValue = parseAmountInput(dailyPrice);
  const dayValue = Number(days);
  const quantityValue = Number(quantity) || 1;
  const validDays = Number.isFinite(dayValue) && dayValue >= 1;
  const due = validDays ? dueDateFrom(startDate, dayValue) : null;
  const total = priceValue && validDays ? priceValue * quantityValue * Math.floor(dayValue) : null;

  const handleSubmit = useCallback(() => {
    setError('');

    if (!selected) return setError(t('rentals.errClient'));
    if (!itemName.trim()) return setError(t('rentals.errItem'));

    const price = parseAmountInput(dailyPrice);
    if (!price) return setError(t('rentals.errPrice'));

    const dayCount = Number(days);
    if (!Number.isFinite(dayCount) || dayCount < 1) return setError(t('rentals.errDays'));

    if (!isValidDateInput(startDate)) return setError(t('rentals.errStartDate'));

    const quantityNumber = Number(quantity);
    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      return setError(t('rentals.errQuantity'));
    }

    const payload = {
      clientId: selected.id,
      itemName: itemName.trim(),
      quantity: quantityNumber,
      dailyPrice: price,
      currency,
      startDate,
      days: Math.floor(dayCount),
      note: note.trim() || undefined,
    };

    const handlers = {
      onSuccess: onClose,
      onError: (err: unknown) => setError((err as Error).message),
    };

    if (rental) {
      updateMutation.mutate({ id: rental.id, ...payload }, handlers);
      return;
    }
    createMutation.mutate(payload, handlers);
  }, [
    selected,
    itemName,
    dailyPrice,
    days,
    startDate,
    quantity,
    currency,
    note,
    rental,
    createMutation,
    updateMutation,
    onClose,
    t,
  ]);

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
              {isEdit ? t('rentals.editTitle') : t('rentals.createTitle')}
            </Text>

            {/* ---- Mijoz ---- */}
            {selected ? (
              <View style={styles.selectedRow}>
                <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.selectedName} numberOfLines={1}>
                  {selected.name}
                </Text>
                {/* Tahrirlashda mijozni almashtirish berilmaydi: bu boshqa
                    odamning yozuvi bo'lib qolardi, yangi ijara ochilishi kerak. */}
                {!isEdit && !client ? (
                  <Pressable onPress={() => setSelected(null)} accessibilityRole="button">
                    <Text style={styles.changeLink}>{t('rentals.changeClient')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={styles.pickerBlock}>
                <Text style={styles.fieldLabel}>{t('rentals.fieldClient')}</Text>
                <SearchField
                  value={contactSearch}
                  onChangeText={setContactSearch}
                  placeholder={t('rentals.searchClient')}
                  accessibilityLabel={t('rentals.searchClient')}
                />
                {visibleContacts.length === 0 ? (
                  <Text style={styles.note}>{t('rentals.noClients')}</Text>
                ) : (
                  visibleContacts.map((contact: Contact) => (
                    <Pressable
                      key={contact.id}
                      onPress={() => setSelected({ id: contact.id, name: contact.fullName })}
                      style={({ pressed }) => [styles.contactRow, pressed && styles.contactPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={contact.fullName}
                    >
                      <Text style={styles.contactName} numberOfLines={1}>
                        {contact.fullName}
                      </Text>
                      <Text style={styles.contactMeta} numberOfLines={1}>
                        {contact.phone || contact.username}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {/* ---- Buyum ---- */}
            <Input label={t('rentals.fieldItem')} value={itemName} onChangeText={setItemName} />

            <View style={styles.pairRow}>
              <Input
                label={t('rentals.fieldQuantity')}
                value={quantity}
                onChangeText={(value) => setQuantity(value.replace(/\D/g, '').slice(0, 5))}
                keyboardType="number-pad"
                containerStyle={styles.pairItem}
              />
              <Input
                label={t('rentals.fieldDays')}
                value={days}
                onChangeText={(value) => setDays(value.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                containerStyle={styles.pairItem}
              />
            </View>

            <Input
              label={t('rentals.fieldDailyPrice')}
              value={dailyPrice}
              onChangeText={(value) => setDailyPrice(formatAmountInput(value))}
              keyboardType="decimal-pad"
            />

            <ChipSelector
              options={currencyOptions}
              value={currency}
              onChange={setCurrency}
              label={t('money.currency')}
            />

            <Input
              label={t('rentals.fieldStartDate')}
              value={startDate}
              onChangeText={(value) => setStartDate(formatDateInputValue(value))}
              keyboardType="number-pad"
              placeholder="2026-10-12"
            />

            <Input label={t('rentals.fieldNote')} value={note} onChangeText={setNote} />

            {/* ---- Hisob: saqlashdan oldingi oxirgi tekshiruv ---- */}
            {total !== null && due ? (
              <View style={styles.preview}>
                <Text style={styles.previewLine}>
                  {t('rentals.previewFormula', {
                    days: String(Math.floor(dayValue)),
                    quantity: String(quantityValue),
                    price: formatMoney(priceValue ?? 0, currency),
                  })}
                </Text>
                <Text style={styles.previewTotal}>{formatMoney(total, currency)}</Text>
                <Text style={styles.previewDue}>{t('rentals.previewDue', { date: due })}</Text>
              </View>
            ) : (
              <Text style={styles.note}>{t('rentals.previewHint')}</Text>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={onClose}
                style={styles.actionBtn}
              />
              <Button
                title={isEdit ? t('common.save') : t('rentals.createSubmit')}
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
    fieldLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    pickerBlock: {
      gap: spacing.xs,
    },
    contactRow: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    contactPressed: {
      backgroundColor: colors.primarySoft,
    },
    contactName: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    contactMeta: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    selectedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.primarySoft,
    },
    selectedName: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      minWidth: 0,
    },
    changeLink: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    pairRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    pairItem: {
      flex: 1,
    },
    preview: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.sm,
      gap: 2,
    },
    previewLine: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    previewTotal: {
      ...typography.body,
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    previewDue: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
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

export default RentalFormModal;
