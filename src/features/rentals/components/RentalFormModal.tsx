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
import { formatAmountInput, formatMoney, parseAmountInput } from '../../../shared/lib/money';
import { formatQuantity } from '../../../shared/lib/quantity';
import { normalizeCurrency } from '../../../shared/lib/currency';
import { isValidDateInput } from '../../../shared/lib/date';
import DateField from '../../../shared/ui/DateField';
import { ContactsContext, type Contact } from '../../debts/context/ContactsContext';
import { useCreateRentalBatch, useRentalItems, useUpdateRental } from '../hooks/useRentals';
import {
  currentTimeString,
  dueFrom,
  durationOf,
  formatMoment,
  formatTimeInputValue,
  isValidTimeInput,
  remainingQuantity,
  rentalPeriod,
  todayString,
} from '../model/rentalMath';
import { freeQuantity, itemsForPeriod } from '../model/rentalStock';
import { periodLabel, perPeriodLabel, quantityLabel, unitCountLabel } from '../model/rentalLabels';
import RentalItemBasketModal, { type RentalPick } from './RentalItemBasketModal';
import { RENTAL_PERIODS, type RentalPeriod, type RentalResponseDTO } from '../types/rental';
import type { RentalItemResponseDTO } from '../types/rentalItem';

interface RentalFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Mijoz oldindan ma'lum bo'lsa (mijoz ekranidan ochilgan) — tanlash so'ralmaydi. */
  client?: { id: string; name: string } | null;
  /** Ombor kartasidan "Ijaraga berish" — shu buyum ro'yxatda tayyor turadi. */
  presetItem?: RentalItemResponseDTO | null;
  /** Berilsa tahrirlash rejimi (bitta yozuv). */
  rental?: RentalResponseDTO | null;
  /**
   * Omborda kerakli buyum yo'q — "buyum qo'shish" ga o'tish. Formani
   * yopish va ombor formasini ochish ota-ekranning ishi: modal ustiga
   * modal qalashtirilmaydi.
   */
  onAddItem?: () => void;
}

/** Ro'yxatda ko'rinadigan mijozlar soni — undan ortig'ini qidiruv bilan topadi. */
const CONTACT_LIMIT = 6;
/** Ombordan tanlash ro'yxatida ko'rinadigan buyumlar soni. */
const ITEM_LIMIT = 8;

/** Muddat uchun tez tugmalar: qurilishda hafta/oy, to'yda 1-2 kun, soatlikda bir necha soat. */
const QUICK_DURATIONS: Record<RentalPeriod, number[]> = {
  DAY: [1, 2, 3, 7, 30],
  HOUR: [1, 2, 3, 4, 8],
};

/** Formadagi bitta buyum qatori — qiymatlar maydon matni ko'rinishida. */
interface Line {
  itemId: string;
  quantity: string;
  price: string;
}

const parseQuantity = (raw: string): number => Number(raw.replace(',', '.'));

/**
 * Ijaraga berish / tahrirlash formasi.
 *
 * BUYUM OMBORDAN tanlanadi: nomini qayta yozish o'rniga ro'yxatdan bosiladi
 * va har birining yonida nechtasi BO'SH ekani turadi. Bo'shidan ko'p
 * yozilsa forma darhol aytadi — server ham baribir rad etadi.
 *
 * Bir mijozga BIR NECHTA buyum birdaniga beriladi (to'yga stul + stol +
 * chodir, qurilishga opalubka + lesa): mijoz, sana va muddat bir marta
 * yoziladi. Bitta buyurtmada davr bitta — kunlik va soatlik aralashmaydi.
 *
 * Forma MUDDATNI (necha kun / necha soat) so'raydi, sanani emas: "nechta
 * kunga berdim" degan savol odamga tabiiy, qaytarish sanasini esa dastur
 * o'zi chiqarib ko'rsatadi.
 *
 * Pastdagi hisob satri ATAYIN bor: summa narxdan ko'paytirilgani uchun
 * odam saqlashdan OLDIN "3 kun × 10 dona × 5 000" ni ko'rib tasdiqlashi
 * kerak. Aks holda ortiqcha nol yozilgani keyin bilinardi.
 */
const RentalFormModal: React.FC<RentalFormModalProps> = ({
  visible,
  onClose,
  client,
  presetItem,
  rental,
  onAddItem,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const keyboardInset = useKeyboardInset();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { contacts } = useContext(ContactsContext);
  // Forma mijoz kartasida doim o'rnatilgan turadi — ombor faqat ochilganda so'raladi.
  const itemsQuery = useRentalItems({ enabled: visible });
  const createMutation = useCreateRentalBatch();
  const updateMutation = useUpdateRental();
  const isEdit = Boolean(rental);

  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [period, setPeriod] = useState<RentalPeriod>('DAY');
  const [lines, setLines] = useState<Line[]>([]);
  const [basketOpen, setBasketOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [startDate, setStartDate] = useState(todayString());
  const [startTime, setStartTime] = useState(currentTimeString());
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Faqat tahrirlash maydonlari: bitta yozuvning miqdori va narxi.
  const [editQuantity, setEditQuantity] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const allItems = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const itemById = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [allItems]);

  /**
   * Oyna har ochilganda toza forma (yoki tahrirlanayotgan yozuv qiymatlari).
   *
   * Bog'liqlik OBYEKT emas, id: mijoz kartasi `client` ni har renderda
   * yangi obyekt qilib beradi va ochiq forma (so'rov yangilanganda) yozib
   * qo'yilgan buyumlari bilan birga tozalanib ketardi.
   */
  const clientId = client?.id;
  const clientName = client?.name;
  const presetId = presetItem?.id;
  useEffect(() => {
    if (!visible) return;
    setError('');
    setContactSearch('');
    setItemSearch('');
    if (rental) {
      const rentalPeriodValue = rentalPeriod(rental);
      setSelected({ id: rental.clientId, name: rental.clientName });
      setPeriod(rentalPeriodValue);
      setLines([]);
      setEditQuantity(formatQuantity(rental.quantity || 1));
      setEditPrice(formatAmountInput(String(rental.price)));
      setStartDate(rental.startDate);
      setStartTime(rental.startTime ?? currentTimeString());
      setDuration(String(durationOf(rental) ?? ''));
      setNote(rental.note ?? '');
      return;
    }
    setSelected(clientId && clientName ? { id: clientId, name: clientName } : null);
    setPeriod(presetItem?.period ?? 'DAY');
    setLines(
      presetItem
        ? [{ itemId: presetItem.id, quantity: '1', price: formatAmountInput(String(presetItem.price)) }]
        : [],
    );
    setStartDate(todayString());
    setStartTime(currentTimeString());
    setDuration('');
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, rental, clientId, clientName, presetId]);

  const periodOptions = useMemo<ChipOption<RentalPeriod>[]>(
    () => RENTAL_PERIODS.map((value) => ({ value, label: periodLabel(t, value) })),
    [t],
  );

  /** Davr almashsa boshqa davrdagi buyumlar ro'yxatdan chiqadi. */
  const handlePeriod = useCallback(
    (next: RentalPeriod) => {
      setPeriod(next);
      setLines((current) => current.filter((line) => itemById.get(line.itemId)?.period === next));
    },
    [itemById],
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

  /** Tanlash uchun buyumlar: shu davrdagi, hali qo'shilmaganlar, bo'shi borlar oldinda. */
  const pickable = useMemo(() => {
    const taken = new Set(lines.map((line) => line.itemId));
    const needle = itemSearch.trim().toLowerCase();
    return itemsForPeriod(allItems, period)
      .filter((item) => !taken.has(item.id))
      .filter(
        (item) =>
          !needle ||
          item.name.toLowerCase().includes(needle) ||
          (item.category ?? '').toLowerCase().includes(needle),
      )
      .sort((a, b) => Number(freeQuantity(b) > 0) - Number(freeQuantity(a) > 0) || a.name.localeCompare(b.name))
      .slice(0, ITEM_LIMIT);
  }, [allItems, period, lines, itemSearch]);

  /**
   * Tanlash oynasidan kelgan natija.
   *
   * Narx SAQLANADI: odam formada chegirma yozgan bo'lsa, oynaga kirib
   * chiqqani uchun u yo'qolmasligi kerak. Yangi buyumga ombordagi narx
   * qo'yiladi.
   */
  const applyBasket = useCallback(
    (picks: RentalPick[]) => {
      setLines((current) => {
        const priceById = new Map(current.map((line) => [line.itemId, line.price]));
        return picks.map((pick) => ({
          itemId: pick.itemId,
          quantity: formatQuantity(pick.quantity),
          price:
            priceById.get(pick.itemId) ??
            formatAmountInput(String(itemById.get(pick.itemId)?.price ?? '')),
        }));
      });
      setBasketOpen(false);
    },
    [itemById],
  );

  const basketInitial = useMemo<RentalPick[]>(
    () =>
      lines.map((line) => ({
        itemId: line.itemId,
        quantity: parseQuantity(line.quantity) || 0,
        // Egasining formasida muddat BITTA — pastdagi maydonda.
        duration: null,
      })),
    [lines],
  );

  const addLine = useCallback((item: RentalItemResponseDTO) => {
    setLines((current) => [
      ...current,
      { itemId: item.id, quantity: '1', price: formatAmountInput(String(item.price)) },
    ]);
    setItemSearch('');
  }, []);

  const updateLine = useCallback((itemId: string, patch: Partial<Line>) => {
    setLines((current) => current.map((line) => (line.itemId === itemId ? { ...line, ...patch } : line)));
  }, []);

  const removeLine = useCallback((itemId: string) => {
    setLines((current) => current.filter((line) => line.itemId !== itemId));
  }, []);

  // ---- Hisob satri: forma to'ldirilgani sayin yangilanadi ----

  const durationValue = Math.floor(Number(duration));
  // Bo'sh maydon — muddatsiz ijara: muddat ham, yakuniy summa ham yo'q.
  const openEndedInput = duration.trim() === '';
  const validDuration = !openEndedInput && Number.isFinite(durationValue) && durationValue >= 1;
  const due = validDuration
    ? dueFrom(period, startDate, period === 'HOUR' ? startTime : null, durationValue)
    : null;

  /** Tahrirlashda bu yozuvning ombordagi buyumi (topilsa — bo'sh sonini tekshirish uchun). */
  const editItem = rental?.rentalItemId ? itemById.get(rental.rentalItemId) : undefined;
  /**
   * Tahrirlashda ko'paytirish mumkin bo'lgan eng ko'p son: ombordagi bo'sh
   * + shu yozuvda allaqachon band turgani (o'zi bilan o'zi to'qnashmasin).
   */
  const editMax = editItem && rental ? freeQuantity(editItem) + remainingQuantity(rental) : null;

  /** Har qator uchun summa — valyuta bo'yicha jamlanadi. */
  const preview = useMemo(() => {
    if (!validDuration) return null;
    const rows: { key: string; label: string; total: number; currency: string }[] = [];
    if (rental) {
      const qty = parseQuantity(editQuantity);
      const price = parseAmountInput(editPrice);
      if (!qty || !price) return null;
      rows.push({
        key: rental.id,
        label: rental.itemName,
        total: qty * price * durationValue,
        currency: normalizeCurrency(rental.currency),
      });
    } else {
      for (const line of lines) {
        const item = itemById.get(line.itemId);
        const qty = parseQuantity(line.quantity);
        const price = parseAmountInput(line.price);
        if (!item || !qty || !price) continue;
        rows.push({
          key: line.itemId,
          label: `${item.name} × ${quantityLabel(t, qty, item.unit)}`,
          total: qty * price * durationValue,
          currency: normalizeCurrency(item.currency),
        });
      }
    }
    if (rows.length === 0) return null;
    const totals = new Map<string, number>();
    for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.total);
    return { rows, totals: [...totals.entries()] };
  }, [validDuration, rental, editQuantity, editPrice, durationValue, lines, itemById, t]);

  const handleSubmit = useCallback(() => {
    setError('');

    if (!selected) return setError(t('rentals.errClient'));
    if (!isValidDateInput(startDate)) return setError(t('rentals.errStartDate'));
    if (period === 'HOUR' && !isValidTimeInput(startTime)) return setError(t('rentals.errTime'));

    // BO'SH muddat = kelishilmagan ("olib ketdim, ish tugagach qaytaraman").
    // Raqam kiritilgan bo'lsa esa u haqiqiy bo'lishi kerak.
    const openEnded = duration.trim() === '';
    const dur = Math.floor(Number(duration));
    if (!openEnded && (!Number.isFinite(dur) || dur < 1)) {
      return setError(t(period === 'HOUR' ? 'rentals.errHours' : 'rentals.errDays'));
    }

    const handlers = {
      onSuccess: onClose,
      onError: (err: unknown) => setError((err as Error).message),
    };
    const time = period === 'HOUR' ? { startTime } : {};

    if (rental) {
      const qty = parseQuantity(editQuantity);
      if (!Number.isFinite(qty) || qty <= 0) return setError(t('rentals.errQuantity'));
      if (editMax !== null && qty > editMax) {
        return setError(t('rentals.errNotEnough', { item: rental.itemName, free: formatQuantity(editMax) }));
      }
      const price = parseAmountInput(editPrice);
      if (!price) return setError(t('rentals.errPrice'));

      updateMutation.mutate(
        {
          id: rental.id,
          itemName: rental.itemName,
          quantity: qty,
          period,
          price,
          currency: normalizeCurrency(rental.currency),
          startDate,
          ...time,
          duration: openEnded ? null : dur,
          note: note.trim() || undefined,
        },
        handlers,
      );
      return;
    }

    if (lines.length === 0) return setError(t('rentals.errNoItems'));

    const payloadLines = [];
    for (const line of lines) {
      const item = itemById.get(line.itemId);
      if (!item) return setError(t('rentals.errNoItems'));
      const qty = parseQuantity(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) return setError(t('rentals.errQuantity'));
      if (qty > freeQuantity(item)) {
        return setError(t('rentals.errNotEnough', { item: item.name, free: formatQuantity(freeQuantity(item)) }));
      }
      const price = parseAmountInput(line.price);
      if (!price) return setError(t('rentals.errPrice'));
      payloadLines.push({ rentalItemId: item.id, quantity: qty, price });
    }

    createMutation.mutate(
      {
        clientId: selected.id,
        period,
        startDate,
        ...time,
        duration: openEnded ? null : dur,
        note: note.trim() || undefined,
        lines: payloadLines,
      },
      handlers,
    );
  }, [
    selected,
    startDate,
    period,
    startTime,
    duration,
    rental,
    editQuantity,
    editMax,
    editPrice,
    lines,
    itemById,
    note,
    createMutation,
    updateMutation,
    onClose,
    t,
  ]);

  const pending = createMutation.isPending || updateMutation.isPending;
  const periodItemsCount = itemsForPeriod(allItems, period).length;

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
              <View style={styles.block}>
                <Text style={styles.fieldLabel}>{t('rentals.fieldClient')}</Text>
                <SearchField
                  value={contactSearch}
                  onChangeText={setContactSearch}
                  placeholder={t('rentals.searchClient')}
                  accessibilityLabel={t('rentals.searchClient')}
                />
                {visibleContacts.length === 0 ? (
                  <Text style={[styles.note, styles.noteText]}>{t('rentals.noClients')}</Text>
                ) : (
                  visibleContacts.map((contact: Contact) => (
                    <Pressable
                      key={contact.id}
                      onPress={() => setSelected({ id: contact.id, name: contact.fullName })}
                      style={({ pressed }) => [styles.pickRow, pressed && styles.pickPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={contact.fullName}
                    >
                      <Text style={styles.pickName} numberOfLines={1}>
                        {contact.fullName}
                      </Text>
                      <Text style={styles.pickMeta} numberOfLines={1}>
                        {contact.phone || contact.username}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {/* ---- Davr: tahrirlashda o'zgarmaydi (summa qoidasi boshqa) ---- */}
            {!isEdit ? (
              <ChipSelector
                options={periodOptions}
                value={period}
                onChange={handlePeriod}
                label={t('rentals.itemPeriod')}
                layout="fluid"
              />
            ) : null}

            {/* ---- Buyumlar ---- */}
            {rental ? (
              <View style={styles.block}>
                <View style={styles.lineHead}>
                  <Text style={styles.lineName} numberOfLines={1}>
                    {rental.itemName}
                  </Text>
                  {editMax !== null ? (
                    <Text style={styles.lineFree} numberOfLines={1}>
                      {t('rentals.freeUpTo', { count: formatQuantity(editMax) })}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.pairRow}>
                  <Input
                    label={t('rentals.fieldQuantity')}
                    value={editQuantity}
                    onChangeText={(value) => setEditQuantity(value.replace(/[^\d.,]/g, '').slice(0, 9))}
                    keyboardType="decimal-pad"
                    containerStyle={styles.pairItem}
                  />
                  <Input
                    label={t(period === 'HOUR' ? 'rentals.itemPriceHour' : 'rentals.itemPriceDay')}
                    value={editPrice}
                    onChangeText={(value) => setEditPrice(formatAmountInput(value))}
                    keyboardType="decimal-pad"
                    containerStyle={styles.pairItem}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.block}>
                <Text style={styles.fieldLabel}>{t('rentals.fieldItems')}</Text>

                {lines.map((line) => {
                  const item = itemById.get(line.itemId);
                  if (!item) return null;
                  const free = freeQuantity(item);
                  const qty = parseQuantity(line.quantity);
                  const tooMany = Number.isFinite(qty) && qty > free;
                  return (
                    <View key={line.itemId} style={styles.lineCard}>
                      <View style={styles.lineHead}>
                        <Text style={styles.lineName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text
                          style={[styles.lineFree, tooMany && { color: colors.negative }]}
                          numberOfLines={1}
                        >
                          {t('rentals.freeCount', { count: quantityLabel(t, free, item.unit) })}
                        </Text>
                        <Pressable
                          onPress={() => removeLine(line.itemId)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={t('rentals.removeItem', { item: item.name })}
                        >
                          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                      <View style={styles.pairRow}>
                        <Input
                          label={t('rentals.fieldQuantity')}
                          value={line.quantity}
                          onChangeText={(value) =>
                            updateLine(line.itemId, { quantity: value.replace(/[^\d.,]/g, '').slice(0, 9) })
                          }
                          keyboardType="decimal-pad"
                          containerStyle={styles.pairItem}
                        />
                        <Input
                          label={t(period === 'HOUR' ? 'rentals.itemPriceHour' : 'rentals.itemPriceDay')}
                          value={line.price}
                          onChangeText={(value) => updateLine(line.itemId, { price: formatAmountInput(value) })}
                          keyboardType="decimal-pad"
                          containerStyle={styles.pairItem}
                        />
                      </View>
                    </View>
                  );
                })}

                {/* OMBORDAN TANLASH o'z oynasida.

                    Ilgari buyumlar shu yerda tekis ro'yxat bo'lib turardi:
                    forma cho'zilib ketar, kategoriya ko'rinmas, buyum ko'p
                    bo'lsa kerakli narsani topish qiyin edi. Endi bu punkt
                    "Narxnomadan tanlash" bilan bir xil oqim. */}
                {periodItemsCount === 0 && !itemsQuery.isLoading ? (
                  <View style={styles.note}>
                    <Text style={styles.noteText}>{t('rentals.stockEmptyForPeriod')}</Text>
                    {onAddItem ? (
                      <Pressable onPress={onAddItem} accessibilityRole="button">
                        <Text style={styles.changeLink}>{t('rentals.addItem')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <>
                    <Pressable
                      onPress={() => setBasketOpen(true)}
                      style={({ pressed }) => [styles.pickRow, pressed && styles.pickPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={t('rentals.basketOpen')}
                    >
                      <Ionicons name="cube-outline" size={18} color={colors.primary} />
                      <View style={styles.pickText}>
                        <Text style={styles.pickName} numberOfLines={1}>
                          {t('rentals.basketOpen')}
                        </Text>
                        <Text style={styles.pickMeta} numberOfLines={1}>
                          {lines.length > 0
                            ? t('rentals.basketSelected', { count: String(lines.length) })
                            : t('rentals.basketNone')}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </Pressable>
                    {onAddItem ? (
                      <Pressable onPress={onAddItem} accessibilityRole="button" style={styles.addItemLink}>
                        <Text style={styles.changeLink}>{t('rentals.addItemToStock')}</Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </View>
            )}

            {/* ---- Muddat ---- */}
            <View style={styles.pairRow}>
              {/* Sana TANLANADI: ijarada u pulning o'zi (kun soni
                  shundan chiqadi) va bitta xato raqam butun hisobni
                  surib yuborardi. */}
              <DateField
                label={t('rentals.fieldStartDate')}
                value={startDate}
                onChange={setStartDate}
                containerStyle={styles.pairItem}
              />
              {period === 'HOUR' ? (
                <Input
                  label={t('rentals.fieldStartTime')}
                  value={startTime}
                  onChangeText={(value) => setStartTime(formatTimeInputValue(value))}
                  keyboardType="number-pad"
                  placeholder="14:00"
                  containerStyle={styles.pairItem}
                />
              ) : null}
            </View>

            <View style={styles.block}>
              <Input
                label={t(period === 'HOUR' ? 'rentals.fieldHours' : 'rentals.fieldDays')}
                value={duration}
                onChangeText={(value) => setDuration(value.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
              />
              <View style={styles.quickRow}>
                {/* Muddatni BO'SHATADI: lesa yoki opalubka beradigan odam
                    yolg'on sana yozishga majbur bo'lmasligi kerak. */}
                <Pressable
                  onPress={() => setDuration('')}
                  style={({ pressed }) => [
                    styles.quick,
                    duration.trim() === '' && styles.quickActive,
                    pressed && styles.pickPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('rentals.openEnded')}
                >
                  <Text
                    style={[styles.quickText, duration.trim() === '' && styles.quickTextActive]}
                  >
                    {t('rentals.openEndedShort')}
                  </Text>
                </Pressable>
                {QUICK_DURATIONS[period].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setDuration(String(value))}
                    style={({ pressed }) => [
                      styles.quick,
                      duration === String(value) && styles.quickActive,
                      pressed && styles.pickPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={unitCountLabel(t, period, value)}
                  >
                    <Text
                      style={[styles.quickText, duration === String(value) && styles.quickTextActive]}
                    >
                      {unitCountLabel(t, period, value)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Input label={t('rentals.fieldNote')} value={note} onChangeText={setNote} />

            {/* ---- Hisob: saqlashdan oldingi oxirgi tekshiruv ---- */}
            {/* Muddatsiz ijarada JAMI ko'rsatilmaydi: u hali yo'q.
                O'ylab topilgan raqam ko'rsatishdan ko'ra hisob qanday
                yurishini aytish to'g'ri. */}
            {openEndedInput ? <Text style={styles.note}>{t('rentals.openEndedHint')}</Text> : null}
            {preview && due ? (
              <View style={styles.preview}>
                {preview.rows.map((row) => (
                  <Text key={row.key} style={styles.previewLine} numberOfLines={1}>
                    {row.label}: {formatMoney(row.total, normalizeCurrency(row.currency))}
                  </Text>
                ))}
                <Text style={styles.previewLine}>
                  {t('rentals.previewFor', { duration: unitCountLabel(t, period, durationValue) })}
                </Text>
                {preview.totals.map(([code, amount]) => (
                  <Text key={code} style={styles.previewTotal}>
                    {formatMoney(amount, normalizeCurrency(code))}
                  </Text>
                ))}
                <Text style={styles.previewDue}>
                  {t('rentals.previewDue', { date: formatMoment(due.date, due.time) })}
                </Text>
              </View>
            ) : (
              <Text style={[styles.note, styles.noteText]}>{t('rentals.previewHint')}</Text>
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

      {/* Tanlash oynasi FORMA ICHIDA turadi: u formaning holatini
          o'zgartiradi va formadan tashqarida bo'lsa tanlov yo'qolardi. */}
      <RentalItemBasketModal
        visible={basketOpen}
        items={allItems}
        period={period}
        initial={basketInitial}
        onClose={() => setBasketOpen(false)}
        onConfirm={applyBasket}
      />
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
    block: {
      gap: spacing.xs,
    },
    pickRow: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    pickRowLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    pickPressed: {
      backgroundColor: colors.primarySoft,
    },
    pickDisabled: {
      opacity: 0.55,
    },
    pickText: {
      flex: 1,
      minWidth: 0,
    },
    pickName: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    pickMeta: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    pickFree: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      maxWidth: '40%',
    },
    addItemLink: {
      alignSelf: 'flex-start',
      paddingVertical: 2,
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
    lineCard: {
      gap: spacing.xs,
      padding: spacing.sm,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    lineHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    lineName: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      minWidth: 0,
    },
    lineFree: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.positive,
      fontVariant: ['tabular-nums'],
    },
    pairRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    pairItem: {
      flex: 1,
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    quick: {
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    quickActive: {
      backgroundColor: colors.primary,
    },
    quickText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    quickTextActive: {
      color: colors.textOnPrimary,
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
      fontVariant: ['tabular-nums'],
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
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.sm,
      gap: spacing.xxs,
    },
    noteText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
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
