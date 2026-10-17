import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../../../shared/ui/AppModal';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';
import { formatAmountInput, formatMoney, parseAmountInput } from '../../../shared/lib/money';
import { isValidDateInput } from '../../../shared/lib/date';
import DateField from '../../../shared/ui/DateField';
import { confirmAction } from '../../../shared/lib/confirm';
import {
  useConfirmRental,
  useDeleteRental,
  usePayRental,
  useRequestRentalPayment,
  useResolveRentalPayment,
  useReturnRental,
} from '../hooks/useRentals';
import {
  accruedAmount,
  billedUnits,
  currentTimeString,
  effectiveEnd,
  formatMoment,
  formatTimeInputValue,
  isValidTimeInput,
  joinMoment,
  minutesBetween,
  isOpenEnded,
  overdueUnits,
  remainingQuantity,
  rentalPeriod,
  rentalStage,
  returnedQuantity,
  startMoment,
  todayString,
  totalQuantity,
  unpaidAmount,
} from '../model/rentalMath';
import { lateLabel, perPeriodLabel, quantityLabel, unitCountLabel } from '../model/rentalLabels';
import { toAmount, type RentalResponseDTO } from '../types/rental';

interface RentalDetailModalProps {
  rental: RentalResponseDTO | null;
  onClose: () => void;
  /** Tahrirlash formasini ochish — forma ota-ekranda turadi. */
  onEdit: (rental: RentalResponseDTO) => void;
  /** Biznesda MEMBER faqat ko'radi — amal tugmalari chiqmaydi. */
  allowWrite?: boolean;
  allowDelete?: boolean;
}

type Pane = 'info' | 'return' | 'payment';

/**
 * Bitta ijaraning kartasi va ikki amali.
 *
 * KO'RINISH: eng muhim raqam — OLINMAGAN QOLDIQ, shuning uchun u tepada,
 * katta va rangli turadi. Qolgan maydonlar uning ostida, ikkinchi darajali
 * matn bilan. Ilgari hammasi bir xil og'irlikdagi jadval edi va odam
 * qaysi raqam muhimligini o'zi qidirib topishi kerak edi.
 *
 * Buyumning qaytishi va pulning kelishi ALOHIDA tugma: hayotda ular bir
 * paytda bo'lmaydi — buyum qaytib, puli bir hafta keyin ham berilishi
 * mumkin. Bitta "yopish" tugmasi bo'lsa dastur ikkisini bir vaqtda bo'ldi
 * deb yozishga majbur qilardi, ya'ni yolg'on tarix.
 *
 * Amal tanlanganda forma AYNI KARTA ichida ochiladi (`Pane`): ustiga
 * yana bir modal qalashtirish telefonda orqaga qaytishni chalkashtiradi.
 */
const RentalDetailModal: React.FC<RentalDetailModalProps> = ({
  rental,
  onClose,
  onEdit,
  allowWrite = true,
  allowDelete = true,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const keyboardInset = useKeyboardInset();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const returnMutation = useReturnRental();
  /*
   * Yozuv MENING daftarimdami.
   *
   * Mijoz tomonida egasining amallari ko'rinmasligi kerak (server ham
   * rad etadi), to'lov yo'li esa teskari bo'ladi.
   */
  const mine = rental?.owner !== false;

  const payMutation = usePayRental();
  // Mijozning to'lovi: yozadi va tasdiq kutadi.
  const payRequestMutation = useRequestRentalPayment();
  // Egasining javobi: tasdiqlash yoki rad etish.
  const payResolveMutation = useResolveRentalPayment();
  const deleteMutation = useDeleteRental();
  const confirmMutation = useConfirmRental();

  const [pane, setPane] = useState<Pane>('info');
  const [returnDate, setReturnDate] = useState(todayString());
  const [returnTime, setReturnTime] = useState(currentTimeString());
  const [returnQty, setReturnQty] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [error, setError] = useState('');

  /**
   * Oyna yangi yozuv bilan ochilganda doim ma'lumot ko'rinishidan boshlanadi.
   *
   * Qoldiqlar effekt ICHIDA hisoblanadi, tashqaridan bog'lanmaydi: aks
   * holda yarim tunda kun almashib qoldiq o'zgarganda effekt qaytadan
   * ishlab, odamning yozib qo'ygan summasini ustidan o'chirardi.
   */
  useEffect(() => {
    if (!rental) return;
    setPane('info');
    setError('');
    setReturnDate(todayString());
    setReturnTime(currentTimeString());
    // Maydonlar QOLGANI bilan to'ldiriladi: ko'p holatda hammasi birdan
    // qaytadi va hech narsa yozmasdan tasdiqlanadi.
    setReturnQty(String(remainingQuantity(rental)));
    const remainingMoney = unpaidAmount(rental);
    setPayAmount(remainingMoney > 0 ? formatAmountInput(String(remainingMoney)) : '');
  }, [rental]);

  const handleReturn = useCallback(() => {
    if (!rental) return;
    setError('');
    if (!isValidDateInput(returnDate)) return setError(t('rentals.errReturnDate'));
    const hourly = rentalPeriod(rental) === 'HOUR';
    if (hourly && !isValidTimeInput(returnTime)) return setError(t('rentals.errTime'));
    // Buyum berilishidan OLDIN qaytarilgan bo'lishi mumkin emas.
    const back = joinMoment(returnDate, hourly ? returnTime : null);
    if ((minutesBetween(startMoment(rental), back) ?? 0) < 0) {
      return setError(t('rentals.errReturnBeforeStart'));
    }

    const left = remainingQuantity(rental);
    const quantity = Number(returnQty);
    if (!Number.isFinite(quantity) || quantity <= 0) return setError(t('rentals.errReturnQty'));
    if (quantity > left) return setError(t('rentals.errReturnTooMany', { count: String(left) }));

    returnMutation.mutate(
      {
        id: rental.id,
        dto: { returnedDate: returnDate, ...(hourly ? { returnedTime: returnTime } : {}), quantity },
      },
      { onSuccess: onClose, onError: (err) => setError((err as Error).message) },
    );
  }, [rental, returnDate, returnTime, returnQty, returnMutation, onClose, t]);

  /**
   * To'lov yozish.
   *
   * YO'L yozuv kimning ekaniga qarab boshqa: egasi o'z daftarida pul
   * olganini darhol yozadi, mijoz esa "pul berdim" deb yozadi va summa
   * egasi tasdiqlagunicha hisobga kirmaydi — aks holda mijoz o'z
   * qarzini o'zi yopib qo'ya olardi.
   */
  const handlePay = useCallback(() => {
    if (!rental) return;
    setError('');
    const amount = parseAmountInput(payAmount);
    if (!amount) return setError(t('rentals.errPayAmount'));

    const handlers = {
      onSuccess: onClose,
      onError: (err: unknown) => setError((err as Error).message),
    };
    const payload = { id: rental.id, dto: { amount, date: todayString() } };

    if (mine) {
      payMutation.mutate(payload, handlers);
    } else {
      payRequestMutation.mutate(payload, handlers);
    }
  }, [rental, payAmount, mine, payMutation, payRequestMutation, onClose, t]);

  /** Egasi mijozning to'loviga javob beradi. */
  const handleResolvePayment = useCallback(
    (accept: boolean) => {
      if (!rental) return;
      setError('');
      payResolveMutation.mutate(
        { id: rental.id, accept },
        { onError: (err) => setError((err as Error).message) },
      );
    },
    [rental, payResolveMutation],
  );

  /**
   * So'rovni tasdiqlash — faqat ombor egasida.
   *
   * Shu paytgacha yozuv ombordan hech narsa band qilmagan; tasdiqdan
   * keyin band bo'ladi va server bo'sh sonini qaytadan tekshiradi.
   */
  const handleConfirm = useCallback(() => {
    if (!rental) return;
    setError('');
    confirmMutation.mutate(rental.id, {
      onSuccess: onClose,
      onError: (err) => setError((err as Error).message),
    });
  }, [rental, confirmMutation, onClose]);

  const handleDelete = useCallback(() => {
    if (!rental) return;
    confirmAction(t('rentals.deleteConfirm', { item: rental.itemName }), () => {
      deleteMutation.mutate(rental.id, {
        onSuccess: onClose,
        onError: (err) => setError((err as Error).message),
      });
    });
  }, [rental, deleteMutation, onClose, t]);

  if (!rental) return null;

  const period = rentalPeriod(rental);
  const hourly = period === 'HOUR';
  const stage = rentalStage(rental);
  const units = billedUnits(rental);
  const late = overdueUnits(rental);
  const accrued = accruedAmount(rental);
  const paid = toAmount(rental.paidAmount);
  const unpaid = unpaidAmount(rental);
  const total = totalQuantity(rental);
  const back = returnedQuantity(rental);
  const left = remainingQuantity(rental);
  const multiple = total > 1;

  const returned = stage === 'DEBT' || stage === 'CLOSED';

  /**
   * MIJOZ TOMONI: yozuv men mijoz bo'lgan ijara (ombor meniki emas).
   *
   * Amallar bu yerda ko'rinmaydi — buyumni qaytgan deb belgilash,
   * tahrirlash va o'chirish ombor egasining ishi va server ularni
   * baribir rad etadi. Ilgari tugmalar chiqib, bosilganda "kirish
   * huquqi yo'q" xatosi berardi.
   *
   * Eski server `owner` ni yubormaydi — u holda avvalgidek egasi deb
   * qaraladi (yozuv o'z daftaridan kelgan).
   */

  const tone =
    stage === 'OVERDUE'
      ? colors.negative
      : stage === 'DEBT'
        ? colors.secondary
        : stage === 'CLOSED'
          ? colors.textSecondary
          : colors.positive;

  // Yopilgan payt: belgi bo'lmasa (faqat partiyalar) oxirgi partiya kuni.
  const returnedOn = effectiveEnd(rental).replace('T', ' ');
  const statusText =
    stage === 'DEBT'
      ? t('rentals.debtStatus', { date: returnedOn })
      : stage === 'CLOSED'
        ? t('rentals.returnedOn', { date: returnedOn })
        : late > 0
          ? lateLabel(t, period, late)
          : isOpenEnded(rental)
            ? t('rentals.openEnded')
            : t('rentals.dueOn', { date: formatMoment(rental.dueDate, hourly ? rental.dueTime : null) });

  return (
    <Modal transparent visible={Boolean(rental)} animationType="slide" onRequestClose={onClose}>
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
            {/* ---- Sarlavha: buyum nomi va holat ---- */}
            <View style={styles.head}>
              <View style={[styles.icon, { backgroundColor: `${tone}1A` }]}>
                <Ionicons name="cube-outline" size={20} color={tone} />
              </View>
              <View style={styles.headText}>
                <Text style={styles.title} numberOfLines={2}>
                  {rental.itemName}
                  {multiple || (rental.unit && rental.unit !== 'DONA')
                    ? ` × ${quantityLabel(t, total, rental.unit)}`
                    : ''}
                </Text>
                <Text style={[styles.statusText, { color: tone }]} numberOfLines={1}>
                  {statusText}
                </Text>
              </View>
            </View>

            {/* ---- Eng muhim raqam: olinmagan qoldiq ----
                Katta va rangli: odam kartani aynan shuni bilish uchun
                ochadi. Hisob yopiq bo'lsa yashil "Hisob toza". */}
            <View style={[styles.hero, { backgroundColor: unpaid > 0 ? colors.negativeSoft : colors.positiveSoft }]}>
              <Text style={styles.heroLabel}>
                {unpaid > 0
                  ? mine
                    ? t('rentals.unpaid')
                    : t('rentals.toPay')
                  : unpaid < 0
                    ? t('rentals.advance')
                    : t('rentals.settled')}
              </Text>
              <Text
                style={[styles.heroValue, { color: unpaid > 0 ? colors.negative : colors.positive }]}
                numberOfLines={1}
              >
                {formatMoney(Math.abs(unpaid), rental.currency)}
              </Text>
              <Text style={styles.heroHint} numberOfLines={1}>
                {t('rentals.heroHint', {
                  accrued: formatMoney(accrued, rental.currency),
                  paid: formatMoney(paid, rental.currency),
                })}
              </Text>
            </View>

            {/* ---- Qisman qaytarish: alohida qatorda, ko'zga tashlansin ---- */}
            {multiple && back > 0 && left > 0 ? (
              <View style={styles.partial}>
                <Ionicons name="repeat-outline" size={15} color={colors.info} />
                <Text style={styles.partialText}>
                  {t('rentals.partialReturn', { back: String(back), left: String(left) })}
                </Text>
              </View>
            ) : null}

            {/* ---- Tafsilotlar ---- */}
            <View style={styles.rows}>
              <DetailRow label={t('rentals.fieldClient')} value={rental.clientName} styles={styles} />
              <DetailRow
                label={t('rentals.fieldPrice')}
                value={`${formatMoney(toAmount(rental.price), rental.currency)} ${perPeriodLabel(t, period)}`}
                styles={styles}
              />
              {multiple ? (
                <DetailRow
                  label={t('rentals.fieldQuantity')}
                  value={t('rentals.quantityLine', { total: String(total), left: String(left) })}
                  styles={styles}
                />
              ) : null}
              <DetailRow
                label={t(hourly ? 'rentals.billedHours' : 'rentals.billedDays')}
                value={unitCountLabel(t, period, units)}
                styles={styles}
              />
              <DetailRow
                label={t('rentals.period')}
                value={`${formatMoment(rental.startDate, hourly ? rental.startTime : null)} → ${formatMoment(
                  rental.dueDate,
                  hourly ? rental.dueTime : null,
                )}`}
                styles={styles}
              />
              {rental.creatorName ? (
                <DetailRow label={t('rentals.givenBy')} value={rental.creatorName} styles={styles} />
              ) : null}
              {rental.note ? (
                <DetailRow label={t('rentals.fieldNote')} value={rental.note} styles={styles} />
              ) : null}
            </View>

            {/* ---- Qaytarish tarixi ---- */}
            {(rental.returns ?? []).length > 0 ? (
              <View style={styles.rows}>
                {(rental.returns ?? []).map((item, index) => (
                  <View key={item.id ?? index} style={styles.detailRow}>
                    <Text style={styles.detailLabel} numberOfLines={1}>
                      {t('rentals.returnedBatch', { count: String(toAmount(item.quantity)) })}
                    </Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {formatMoment(item.returnedDate, hourly ? item.returnedTime : null)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* ---- Amallar ---- */}
            {pane === 'info' ? (
              <View style={styles.actionsColumn}>
                {/* Tasdiq kutayotgan yozuv: boshqa amallardan OLDIN —
                    tasdiqlanmaguncha buyum band ham emas, hisob ham
                    yurmaydi, ya'ni birinchi qadam shu. */}
                {rental.canConfirm ? (
                  <Button
                    title={t('rentals.confirm')}
                    onPress={handleConfirm}
                    loading={confirmMutation.isPending}
                  />
                ) : null}
                {mine && allowWrite && !returned ? (
                  <Button title={t('rentals.markReturned')} onPress={() => setPane('return')} />
                ) : null}
                {/*
                  PUL BU YERDA YOZILMAYDI — u Qarzlar bo'limida.
                  Ijara summasi "Qarz berish" bilan birga pul yozuviga
                  kiradi, shuning uchun bu yerda ikkinchi marta to'lov
                  yozish pulni BOSHQA daftarga tushirardi: odam
                  to'lagandan keyin ham qarz ko'rinib turardi.
                */}
                {/* MIJOZ tomoni: pulni u beradi, demak yozuvni ham u
                    boshlaydi. Summa egasi tasdiqlagunicha hisobga
                    kirmaydi. */}

                {/* Egasiga: mijoz yozgan summa va javob tugmalari. Rad
                    etish tasdiqlash bilan birga turadi — yolg'on yozuv
                    kartada abadiy osilib qolmasligi kerak. */}
                {rental.canConfirmPayment && rental.pendingPayment ? (
                  <View style={styles.pending}>
                    <Text style={styles.pendingTitle}>{t('rentals.paymentFromClient')}</Text>
                    <Text style={styles.pendingAmount}>
                      {formatMoney(rental.pendingPayment, rental.currency)}
                    </Text>
                    <View style={styles.actionsRow}>
                      <Button
                        title={t('rentals.paymentReject')}
                        variant="secondary"
                        onPress={() => handleResolvePayment(false)}
                        loading={payResolveMutation.isPending}
                        style={styles.actionBtn}
                      />
                      <Button
                        title={t('rentals.paymentAccept')}
                        onPress={() => handleResolvePayment(true)}
                        loading={payResolveMutation.isPending}
                        style={styles.actionBtn}
                      />
                    </View>
                  </View>
                ) : null}
                {/* Mijozga: yozuvim qabul qilinishini kutyapman. */}
                {!mine && rental.pendingPayment ? (
                  <View style={styles.pending}>
                    <Text style={styles.pendingTitle}>{t('rentals.paymentWaiting')}</Text>
                    <Text style={styles.pendingAmount}>
                      {formatMoney(rental.pendingPayment, rental.currency)}
                    </Text>
                    <Text style={styles.note}>{t('rentals.paymentWaitingHint')}</Text>
                  </View>
                ) : null}
                {/* MIJOZ o'z tasdiqlanmagan so'rovini qaytarib oladi.
                    Aks holda noto'g'ri yozilgan so'rov do'kon javob
                    bermaguncha osilib qolar va qarzda ko'rinib turardi. */}
                {!mine && rental.canWithdraw ? (
                  <Button
                    title={t('rentals.withdraw')}
                    variant="secondary"
                    onPress={handleDelete}
                    loading={deleteMutation.isPending}
                  />
                ) : null}
                {mine && (allowWrite || allowDelete) ? (
                  <View style={styles.actionsRow}>
                    {allowWrite ? (
                      <Button
                        title={t('common.edit')}
                        variant="secondary"
                        onPress={() => onEdit(rental)}
                        style={styles.actionBtn}
                      />
                    ) : null}
                    {allowDelete ? (
                      <Button
                        title={t('common.delete')}
                        variant="secondary"
                        onPress={handleDelete}
                        loading={deleteMutation.isPending}
                        style={styles.actionBtn}
                      />
                    ) : null}
                  </View>
                ) : null}
                <Button title={t('common.close')} variant="secondary" onPress={onClose} />
              </View>
            ) : null}

            {pane === 'return' ? (
              <View style={styles.pane}>
                {/* Miqdor FAQAT bittadan ko'p berilgan bo'lsa so'raladi:
                    bitta buyumda bu savol ortiqcha bosqich bo'lardi. */}
                {multiple ? (
                  <Input
                    label={t('rentals.returnQty', { left: String(left) })}
                    value={returnQty}
                    onChangeText={(value) => setReturnQty(value.replace(/[^\d.]/g, '').slice(0, 7))}
                    keyboardType="decimal-pad"
                  />
                ) : null}
                <View style={styles.actionsRow}>
                  {/* Qaytish sanasi ham tanlanadi: u ham hisobga
                      to'g'ridan-to'g'ri kiradi. */}
                  <DateField
                    label={t('rentals.returnDate')}
                    value={returnDate}
                    onChange={setReturnDate}
                    containerStyle={styles.actionBtn}
                  />
                  {/* Soat faqat soatlik ijarada: kunlikda hisob sana bo'yicha. */}
                  {hourly ? (
                    <Input
                      label={t('rentals.returnTime')}
                      value={returnTime}
                      onChangeText={(value) => setReturnTime(formatTimeInputValue(value))}
                      keyboardType="number-pad"
                      placeholder="18:00"
                      containerStyle={styles.actionBtn}
                    />
                  ) : null}
                </View>
                <Text style={styles.note}>
                  {multiple ? t('rentals.returnHintMany') : t('rentals.returnHint')}
                </Text>
                <View style={styles.actionsRow}>
                  <Button
                    title={t('common.cancel')}
                    variant="secondary"
                    onPress={() => setPane('info')}
                    style={styles.actionBtn}
                  />
                  <Button
                    title={t('rentals.markReturned')}
                    onPress={handleReturn}
                    loading={returnMutation.isPending}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            ) : null}

            {pane === 'payment' ? (
              <View style={styles.pane}>
                <Input
                  label={mine ? t('rentals.payAmount') : t('rentals.iPaidTitle')}
                  value={payAmount}
                  onChangeText={(value) => setPayAmount(formatAmountInput(value))}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.note}>
                  {mine ? t('rentals.payHint') : t('rentals.paymentWaitingHint')}
                </Text>
                <View style={styles.actionsRow}>
                  <Button
                    title={t('common.cancel')}
                    variant="secondary"
                    onPress={() => setPane('info')}
                    style={styles.actionBtn}
                  />
                  <Button
                    title={mine ? t('rentals.takePayment') : t('rentals.iPaid')}
                    onPress={handlePay}
                    loading={payMutation.isPending || payRequestMutation.isPending}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, styles }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel} numberOfLines={1}>
      {label}
    </Text>
    <Text style={styles.detailValue} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

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
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headText: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    statusText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
    },
    // Kartaning markazi: bitta katta raqam va uning ostida qisqa izoh.
    hero: {
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: 1,
    },
    heroLabel: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    heroValue: {
      ...typography.amount,
      fontSize: 26,
      lineHeight: 32,
      fontVariant: ['tabular-nums'],
    },
    heroHint: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    partial: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.infoSoft,
      borderRadius: radius.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    partialText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.info,
      flexShrink: 1,
    },
    rows: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: 5,
    },
    detailLabel: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    detailValue: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'right',
      flexShrink: 1,
      fontVariant: ['tabular-nums'],
    },
    pane: {
      gap: spacing.sm,
    },
    actionsColumn: {
      gap: spacing.xs,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
    // Kutayotgan to'lov: alohida sirtda, chunki u HALI hisobda emas.
    pending: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    pendingTitle: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    pendingAmount: {
      ...typography.body,
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
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
  });

export default RentalDetailModal;
