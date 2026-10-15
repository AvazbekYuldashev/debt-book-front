import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../../../shared/ui/AppModal';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';
import { formatMoney } from '../../../shared/lib/money';
import { isValidDateInput } from '../../../shared/lib/date';
import DateField from '../../../shared/ui/DateField';
import { useBusinessRentalItems } from '../hooks/useRentals';
import RentalItemRow from './RentalItemRow';
import { groupRentalItems } from '../model/rentalStock';
import EmptyState from '../../../shared/ui/EmptyState';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import { currentTimeString, formatTimeInputValue, isValidTimeInput, todayString } from '../model/rentalMath';
import { perPeriodLabel, periodLabel } from '../model/rentalLabels';
import { freeQuantity } from '../model/rentalStock';
import type { RentalRequestDTO } from '../types/rental';
import type { RentalItemResponseDTO } from '../types/rentalItem';

interface RentalRequestModalProps {
  /** Ijara beruvchi biznes. */
  businessId: string;
  /**
   * Qaysi buyum so'ralmoqda.
   *
   * null bo'lsa oyna OMBOR RO'YXATI bilan ochiladi: qarz oynasidan
   * "ijaraga olish" bosilganda buyum hali tanlanmagan bo'ladi.
   */
  item: RentalItemResponseDTO | null;
  /** Buyumsiz ham ochilishi uchun — ro'yxat bosqichi. */
  visible?: boolean;
  onClose: () => void;
  /**
   * So'rov YUBORILDI.
   *
   * Oyna baribir bir qadam orqaga qaytadi — bu faqat "bo'ldi" degan
   * xabar uchun: ilgari yuborilgandan keyin hech qanday belgi yo'q edi
   * va odam yozuv yaratilganini bilmay, "ishlamadi" deb o'ylardi.
   * Berilmasa `onClose` ishlaydi.
   */
  /**
   * Buyum TANLANDI — yozuv hali YARATILMAYDI.
   *
   * Narxnoma savati bilan bir xil: tanlov formani to'ldiradi, yozuv
   * esa "Qarz berish" bosilganda ikkalasi birga saqlanadi. Shu bilan
   * bitta pul ikki marta hisoblanmaydi (ijara qoldig'i + pul yozuvi).
   */
  onPicked?: (draft: RentalRequestDTO, total: number) => void;
  /**
   * KELGAN JOYGA qaytish (qarz oynasi).
   *
   * Berilsa RO'YXAT bosqichida ham orqaga tugmasi chiqadi: odam u
   * yerdan "Narxnomadan tanlash" ga o'tmoqchi bo'lishi mumkin va
   * buning uchun butun oqimni yopishi shart emas.
   */
  onBack?: () => void;
}

/**
 * MIJOZ tomonidan yoziladigan ijara: "men shu do'kondan shuni oldim".
 *
 * Egasining formasidan ATAYLAB sodda: mijoz tanlaydigan narsa faqat
 * NECHTA va QANCHA MUDDATGA. Narx ombordagi narx bo'yicha olinadi —
 * chegirma egasining ishi va uni mijoz o'zi yozib qo'ya olmaydi.
 *
 * Yozuv do'konning daftariga tushadi, lekin TASDIQ KUTIB turadi va
 * ombordan hech narsa band qilmaydi: ombor birovning mulki.
 */
const RentalRequestModal: React.FC<RentalRequestModalProps> = ({
  businessId,
  item,
  visible,
  onClose,
  onPicked,
  onBack,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const keyboardInset = useKeyboardInset();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);


  /**
   * Tanlangan buyum: tashqaridan kelgani yoki ro'yxatdan bosilgani.
   *
   * Ikki bosqich bitta oynada: ustiga yana bir modal qalashtirish
   * telefonda orqaga qaytishni chalkashtiradi.
   */
  const open = visible ?? Boolean(item);
  const [picked, setPicked] = useState<RentalItemResponseDTO | null>(null);
  const chosen = item ?? picked;
  const itemsQuery = useBusinessRentalItems(businessId, { enabled: open && !chosen });

  const [quantity, setQuantity] = useState('1');
  const [startDate, setStartDate] = useState(todayString());
  const [startTime, setStartTime] = useState(currentTimeString());
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Oyna yopilганda tanlov ham tozalanadi: qayta ochilganda eski
  // buyum bilan ochilib qolmasin.
  useEffect(() => {
    if (!open) setPicked(null);
  }, [open]);

  useEffect(() => {
    if (!chosen) return;
    setQuantity('1');
    setStartDate(todayString());
    setStartTime(currentTimeString());
    setDuration('');
    setNote('');
    setError('');
  }, [chosen]);

  const hourly = chosen?.period === 'HOUR';
  const free = chosen ? freeQuantity(chosen) : 0;

  const handleSubmit = useCallback(() => {
    if (!chosen) return;
    setError('');

    const count = Number(quantity.replace(',', '.'));
    if (!Number.isFinite(count) || count <= 0) return setError(t('rentals.errQuantity'));
    // Bo'shidan ko'p so'rash ma'nosiz: server ham tasdiqlash paytida rad etadi.
    if (count > free) return setError(t('rentals.errNotEnough', { count: String(free) }));

    // Bo'sh muddat = kelishilmagan: do'kondan olib ketdim, qaytarish
    // sanasini aytmadim. Do'kon baribir tasdiqlaydi.
    const openEnded = duration.trim() === '';
    const length = Number(duration);
    if (!openEnded && (!Number.isFinite(length) || length < 1)) {
      return setError(t('rentals.errDays'));
    }
    if (!isValidDateInput(startDate)) return setError(t('rentals.errStartDate'));
    if (hourly && !isValidTimeInput(startTime)) return setError(t('rentals.errTime'));

    const draft: RentalRequestDTO = {
      businessId,
      lines: [{ rentalItemId: chosen.id, quantity: count }],
      startDate,
      ...(hourly ? { startTime } : {}),
      duration: openEnded ? null : Math.floor(length),
      note: note.trim() || undefined,
    };

    // Yozuv YARATILMAYDI: u "Qarz berish" bilan birga saqlanadi.
    onPicked?.(draft, count * (openEnded ? 1 : Math.floor(length)) * chosen.price);
    onClose();
  }, [chosen, quantity, free, duration, startDate, startTime, hourly, note, businessId, onPicked, onClose, t]);

  /**
   * ORQAGA bir qadam.
   *
   * Formadan RO'YXATGA, ro'yxatdan esa KELGAN JOYGA (qarz oynasiga).
   * Buyum tashqaridan berilgan bo'lsa (ombor qatoriga bosib kelgan)
   * ro'yxat bosqichi umuman bo'lmagan — u holda to'g'ridan-to'g'ri
   * kelgan joyga qaytiladi.
   */
  const toList = useCallback(() => {
    setPicked(null);
    setError('');
  }, []);

  const goBack = !item && picked ? toList : onBack;
  const canGoBack = Boolean(goBack);

  if (!open) return null;

  const total = chosen ? Number(quantity.replace(',', '.')) * Number(duration) * chosen.price : 0;
  const showTotal = Number.isFinite(total) && total > 0;

  return (
    /* Qurilmaning ORQAGA tugmasi ham bir qadam orqaga qaytaradi, butun
       oqimni yopmaydi: tanlashdan keyin yopilib ketsa odam hammasini
       boshidan boshlashga majbur bo'lardi. */
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={goBack ?? onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: theme.spacing.lg + keyboardInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.titleRow}>
              {canGoBack ? (
                <Pressable
                  onPress={goBack}
                  hitSlop={8}
                  style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.back')}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
                </Pressable>
              ) : null}
              <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
                {chosen ? t('rentals.requestTitle', { item: chosen.name }) : t('rentals.theirStock')}
              </Text>
            </View>

            {/* BIRINCHI BOSQICH: buyum tanlanmagan bo'lsa ombor ro'yxati. */}
            {!chosen ? (
              itemsQuery.isLoading ? (
                <SkeletonContactList count={3} />
              ) : (itemsQuery.data ?? []).length === 0 ? (
                <EmptyState
                  icon="cube-outline"
                  title={t('rentals.theirStock')}
                  description={t('rentals.theirStockEmpty')}
                />
              ) : (
                <View style={styles.stock}>
                  {groupRentalItems(itemsQuery.data ?? []).flatMap((group) =>
                    group.items.map((stockItem, index) => (
                      <RentalItemRow
                        key={stockItem.id}
                        item={stockItem}
                        isLast={index === group.items.length - 1}
                        onPress={setPicked}
                      />
                    )),
                  )}
                </View>
              )
            ) : null}

            {chosen ? (
              <>
            <View style={styles.priceRow}>
              <Ionicons name="pricetag-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.priceText}>
                {`${formatMoney(chosen.price, chosen.currency)} ${perPeriodLabel(t, chosen.period)}`}
                {' · '}
                {t('rentals.freeCount', { count: String(free) })}
              </Text>
            </View>

            <View style={styles.pairRow}>
              <Input
                label={t('rentals.fieldQuantity')}
                value={quantity}
                onChangeText={(value) => setQuantity(value.replace(/[^\d.]/g, '').slice(0, 7))}
                keyboardType="decimal-pad"
                containerStyle={styles.pairItem}
              />
              <Input
                label={periodLabel(t, chosen.period)}
                value={duration}
                onChangeText={(value) => setDuration(value.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                containerStyle={styles.pairItem}
              />
            </View>

            <DateField
              label={t('rentals.fieldStartDate')}
              value={startDate}
              onChange={setStartDate}
            />

            {hourly ? (
              <Input
                label={t('rentals.fieldStartTime')}
                value={startTime}
                onChangeText={(value) => setStartTime(formatTimeInputValue(value))}
                keyboardType="number-pad"
                placeholder="14:00"
              />
            ) : null}

            <Input label={t('rentals.fieldNote')} value={note} onChangeText={setNote} />

            {showTotal ? (
              <View style={styles.preview}>
                <Text style={styles.previewTotal}>{formatMoney(total, chosen.currency)}</Text>
                <Text style={styles.previewHint}>{t('rentals.requestHint')}</Text>
              </View>
            ) : (
              <Text style={styles.note}>{t('rentals.requestHint')}</Text>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

              </>
            ) : null}

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={onClose}
                style={styles.actionBtn}
              />
              {chosen ? (
                <Button
                  title={t('rentals.requestSubmit')}
                  onPress={handleSubmit}
                      style={styles.actionBtn}
                />
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    backdrop: { flex: 1, ...glass.scrim },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
    },
    card: {
      ...modalCardLayout,
      ...glass.modal,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
    backBtn: {
      marginLeft: -spacing.xxs,
      padding: spacing.xxs,
    },
    backPressed: { opacity: 0.6 },
    title: {
      ...typography.heading2,
      flexShrink: 1,
      fontSize: 18,
      color: colors.textPrimary,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    priceText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    pairRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    pairItem: { flex: 1 },
    // Ombor ro'yxati karta ichida: qatorlar o'z sirtida turadi.
    stock: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    preview: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.sm,
      gap: 2,
    },
    previewTotal: {
      ...typography.body,
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    previewHint: {
      ...typography.caption,
      fontSize: 12,
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
    actionBtn: { flex: 1 },
  });

export default RentalRequestModal;
