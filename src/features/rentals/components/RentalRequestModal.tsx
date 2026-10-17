import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../../../shared/ui/AppModal';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import DateField from '../../../shared/ui/DateField';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';
import { formatMoney } from '../../../shared/lib/money';
import { formatQuantity } from '../../../shared/lib/quantity';
import { isValidDateInput } from '../../../shared/lib/date';
import { useBusinessRentalItems, useRentalItems } from '../hooks/useRentals';
import RentalItemBasketModal, { type RentalPick } from './RentalItemBasketModal';
import {
  currentTimeString,
  formatTimeInputValue,
  isValidTimeInput,
  rentalPeriod as periodOf,
  todayString,
} from '../model/rentalMath';
import { unitCountLabel } from '../model/rentalLabels';
import type { RentalPeriod, RentalRequestDTO } from '../types/rental';
import type { RentalItemResponseDTO } from '../types/rentalItem';

interface RentalRequestModalProps {
  /** Ijara beruvchi biznes. */
  businessId: string;
  /**
   * Oldindan tanlangan buyum.
   *
   * null bo'lsa oyna TANLASH OYNASI bilan ochiladi: qarz oynasidan
   * "ijaraga olish" bosilganda buyum hali tanlanmagan bo'ladi.
   */
  item: RentalItemResponseDTO | null;
  visible?: boolean;
  onClose: () => void;
  /**
   * Buyumlar TANLANDI — yozuv hali YARATILMAYDI.
   *
   * Narxnoma savati bilan bir xil: tanlov formani to'ldiradi, yozuv
   * esa "Qarz berish" bosilganda saqlanadi. Shu bilan bitta pul ikki
   * marta hisoblanmaydi (ijara qoldig'i + pul yozuvi).
   */
  onPicked?: (
    picked: { draft: RentalRequestDTO; total: number; label: string; period: RentalPeriod }[],
  ) => void;
  /**
   * Avvalgi TANLOV — savat shu bilan ochiladi.
   *
   * Narxnoma savati kabi: qayta kirilganda tanlov joyida turadi va
   * o'zgartiriladi. Ilgari har kirish noldan boshlanardi va odam
   * "tanlaganim qani?" deb o'ylardi.
   */
  initialPicks?: RentalPick[];
  /** Kelgan joyga qaytish (qarz oynasi). */
  onBack?: () => void;
  /**
   * O'Z omboridan berish (ijaraga BERISH).
   *
   * Ijaraga berish ham qarz berish: buyum odamga ketadi va puli menga
   * qarz bo'lib qoladi. Shuning uchun oqim bir xil - farqi faqat
   * ombor qayerdanligi va sarlavhada.
   */
  ownStock?: boolean;
  /**
   * Shu oqimda ALLAQACHON tanlangan miqdorlar (itemId -> soni).
   *
   * Bo'sh sonidan ayriladi va tepada eslatma bo'lib chiqadi: odam
   * "nima olgan edim" degan savolga javob olishi kerak, chunki har
   * kirish YANGI tanlov (shu bilan bir buyumni turli muddatga olish
   * mumkin bo'ladi).
   */
}

/**
 * MIJOZ tomonidan yoziladigan ijara: "men shu do'kondan shuni oldim".
 *
 * IKKI BOSQICH: avval ombordan buyum tanlanadi, keyin muddat/sana.
 * Tanlash narxnoma savati bilan AYNI oyna ko'rinishida — qidiruv,
 * kategoriya chiplari va har qator yonida miqdor. Ilgari u oddiy
 * ro'yxat edi: bir vaqtda bitta buyum, qidiruvsiz, kategoriyasiz va
 * tanlangan buyumni qaytarib olish yo'li yo'q edi.
 *
 * Narx mijozga ko'rsatiladi, lekin u YOZA OLMAYDI: chegirma egasining
 * ishi. Miqdor esa tanlash oynasida belgilanadi.
 *
 * Kunlik va soatlik buyum bitta ijarada aralashmaydi — server ham
 * shuni talab qiladi, shuning uchun bu yerda ham tekshiriladi.
 */
const RentalRequestModal: React.FC<RentalRequestModalProps> = ({
  businessId,
  item,
  visible,
  onClose,
  onPicked,
  onBack,
  initialPicks,
  ownStock = false,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const keyboardInset = useKeyboardInset();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const open = visible ?? Boolean(item);
  // Ombor MENIKI bo'lsa boshqa endpoint: do'konning ochiq ro'yxati emas,
  // o'z ish maydonimdagi buyumlar.
  const theirStock = useBusinessRentalItems(businessId, { enabled: open && !ownStock });
  const myStock = useRentalItems({ enabled: open && ownStock });
  const itemsQuery = ownStock ? myStock : theirStock;
  const stock = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  const [picks, setPicks] = useState<RentalPick[]>([]);
  /** Buyum tashqaridan kelmagan bo'lsa oyna TANLASHDAN boshlanadi. */
  const [basketOpen, setBasketOpen] = useState(false);

  const [startDate, setStartDate] = useState(todayString());
  const [startTime, setStartTime] = useState(currentTimeString());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    // Har ochilishda toza boshlanadi: eski tanlov bilan ochilib qolmasin.
    const seeded = item
      ? [{ itemId: item.id, quantity: 1, duration: null }]
      : initialPicks ?? [];
    setPicks(seeded);
    // Tanlov bor bo'lsa FORMA ochiladi: odam uni ko'rib, kerak bo'lsa
    // savatga kirib o'zgartiradi.
    setBasketOpen(!item && seeded.length === 0);
    setStartDate(todayString());
    setStartTime(currentTimeString());
    setNote('');
    setError('');
  }, [open, item, initialPicks]);

  const itemById = useMemo(
    () => new Map(stock.map((stockItem) => [stockItem.id, stockItem])),
    [stock],
  );

  /** Tanlangan buyumlar — ombordagi ma'lumoti bilan. */
  const chosen = useMemo(
    () =>
      picks
        .map((pick) => ({ pick, item: itemById.get(pick.itemId) ?? (item?.id === pick.itemId ? item : undefined) }))
        .filter((row): row is { pick: RentalPick; item: RentalItemResponseDTO } => Boolean(row.item)),
    [picks, itemById, item],
  );

  /** Davr BIRINCHI buyumdan olinadi: hammasi bir xil bo'lishi shart. */
  const period: RentalPeriod = chosen.length > 0 ? periodOf(chosen[0].item) : 'DAY';
  const hourly = period === 'HOUR';
  const mixedPeriod = chosen.some((row) => periodOf(row.item) !== period);

  /**
   * Summa HAR BUYUM bo'yicha: miqdor × narx × muddat.
   *
   * Muddat kiritilmagan bo'lsa bir davr hisoblanadi — hisob keyin
   * kundan kunga o'sib boradi va yakuniy summa hozir ma'lum emas.
   */
  const total = useMemo(
    () =>
      chosen.reduce(
        (sum, row) => sum + row.pick.quantity * row.item.price * (row.pick.duration ?? 1),
        0,
      ),
    [chosen],
  );

  const currency = chosen[0]?.item.currency;

  const handleSubmit = useCallback(() => {
    setError('');
    if (chosen.length === 0) return setError(t('rentals.errNoItems'));
    // Kunlik va soatlik bitta ijarada aralashmaydi — server ham rad etadi.
    if (mixedPeriod) return setError(t('rentals.errPeriodMix'));

    for (const row of chosen) {
      const free = row.item.totalQuantity - (row.item.busyQuantity ?? 0);
      if (row.pick.quantity > free) {
        return setError(
          t('rentals.errNotEnough', { item: row.item.name, free: formatQuantity(free) }),
        );
      }
    }

    if (!isValidDateInput(startDate)) return setError(t('rentals.errStartDate'));
    if (hourly && !isValidTimeInput(startTime)) return setError(t('rentals.errTime'));

    /*
     * MUDDATI BIR XIL buyumlar bitta so'rovga yig'iladi.
     *
     * Bitta yozuvda bitta muddat bo'ladi (server shunday), shuning
     * uchun turli muddatlar alohida so'rov bo'lib ketadi - odam uchun
     * esa bu bitta amal bo'lib qoladi.
     */
    const groups = new Map<string, typeof chosen>();
    for (const row of chosen) {
      const key = String(row.pick.duration ?? '');
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    const picked: {
      draft: RentalRequestDTO;
      total: number;
      label: string;
      period: RentalPeriod;
    }[] = [];
    for (const rows of groups.values()) {
      const draft: RentalRequestDTO = {
        businessId,
        lines: rows.map((row) => ({ rentalItemId: row.item.id, quantity: row.pick.quantity })),
        startDate,
        ...(hourly ? { startTime } : {}),
        duration: rows[0].pick.duration,
        note: note.trim() || undefined,
      };
      const groupTotal = rows.reduce(
        (sum, row) => sum + row.pick.quantity * row.item.price * (row.pick.duration ?? 1),
        0,
      );
      /*
       * Izoh TAFSILOTLI: nomi, soni, muddati va summasi.
       *
       * Tranzaksiya kartasida ijara uchun "Chek" bloki yo'q (u
       * narxnoma qatorlaridan quriladi), shuning uchun tushuntirish
       * izohga yoziladi - aks holda kartada izohsiz raqam turardi.
       */
      const label = rows
        .map((row) => {
          const span = row.pick.duration
            ? ` · ${unitCountLabel(t, periodOf(row.item), row.pick.duration)}`
            : ` · ${t('rentals.openEndedShort')}`;
          const sum = row.pick.quantity * row.item.price * (row.pick.duration ?? 1);
          return `${row.item.name} × ${formatQuantity(row.pick.quantity)}${span} — ${formatMoney(sum, row.item.currency)}`;
        })
        .join(', ');

      picked.push({ draft, total: groupTotal, label, period });
    }

    // Yozuv YARATILMAYDI: u "Qarz berish" bilan birga saqlanadi.
    // Hammasi BIRVARAKAY: chaqiruvchi avvalgi tanlovni shu bilan
    // almashtiradi, ustiga qo'shmaydi.
    onPicked?.(picked);
    onClose();
  }, [
    chosen,
    mixedPeriod,
    hourly,
    startDate,
    startTime,
    note,
    businessId,
    onPicked,
    onClose,
    t,
  ]);

  /**
   * ORQAGA bir qadam: formadan TANLASHGA, tanlashdan kelgan joyga.
   *
   * Buyum tashqaridan berilgan bo'lsa tanlash bosqichi bo'lmagan va
   * to'g'ridan-to'g'ri kelgan joyga qaytiladi.
   */
  const goBack = !item && picks.length > 0 ? () => setBasketOpen(true) : onBack;

  if (!open) return null;

  return (
    <>
      {/* Qurilmaning ORQAGA tugmasi ham bir qadam orqaga qaytaradi. */}
      <Modal transparent visible={open} animationType="slide" onRequestClose={goBack ?? onClose}>
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
              <View style={styles.titleRow}>
                {goBack ? (
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
                  {ownStock ? t('rentals.createTitle') : t('rentals.takeFromStock')}
                </Text>
              </View>

              {/* Tanlangan buyumlar: nomi, soni va narxi. Miqdor tanlash
                  oynasida o'zgaradi — forma qisqa qoladi. */}
              <Pressable
                onPress={() => setBasketOpen(true)}
                style={({ pressed }) => [styles.pickBtn, pressed && styles.backPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('rentals.basketOpen')}
              >
                <Ionicons name="cube-outline" size={18} color={colors.primary} />
                <Text style={styles.pickBtnText} numberOfLines={1}>
                  {chosen.length > 0
                    ? t('rentals.basketSelected', { count: String(chosen.length) })
                    : t('rentals.basketOpen')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Pressable>

              {chosen.map((row) => (
                <View key={row.item.id} style={styles.lineRow}>
                  <Text style={styles.lineName} numberOfLines={1}>
                    {`${row.item.name} × ${formatQuantity(row.pick.quantity)}`}
                    {row.pick.duration
                      ? ` · ${unitCountLabel(t, periodOf(row.item), row.pick.duration)}`
                      : ` · ${t('rentals.openEndedShort')}`}
                  </Text>
                  <Text style={styles.linePrice} numberOfLines={1}>
                    {formatMoney(row.item.price, row.item.currency)}
                  </Text>
                </View>
              ))}

              {hourly ? (
                <Input
                  label={t('rentals.fieldStartTime')}
                  value={startTime}
                  onChangeText={(value) => setStartTime(formatTimeInputValue(value))}
                  keyboardType="number-pad"
                  placeholder="14:00"
                />
              ) : null}

              <DateField
                label={t('rentals.fieldStartDate')}
                value={startDate}
                onChange={setStartDate}
              />

              <Input label={t('rentals.fieldNote')} value={note} onChangeText={setNote} />

              <View style={styles.preview}>
                {total > 0 ? (
                  <Text style={styles.previewTotal}>{formatMoney(total, currency)}</Text>
                ) : null}
                <Text style={styles.previewHint}>
                  {ownStock ? t('rentals.giveHint') : t('rentals.requestHint')}
                </Text>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.actions}>
                <Button
                  title={t('common.cancel')}
                  variant="secondary"
                  onPress={onClose}
                  style={styles.actionBtn}
                />
                <Button
                  title={ownStock ? t('rentals.createSubmit') : t('rentals.requestSubmit')}
                  onPress={handleSubmit}
                  style={styles.actionBtn}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tanlash narxnoma savati bilan AYNI oyna. */}
      <RentalItemBasketModal
        visible={open && basketOpen}
        items={stock}
        initial={picks}
        askDuration
        // "x" — formaga qaytaradi (tanlov bo'lsa), "Bekor qilish" esa
        // butun ijara oqimini yopadi.
        onClose={() => (picks.length > 0 ? setBasketOpen(false) : onClose())}
        onCancel={onClose}
        onConfirm={(next) => {
          setPicks(next);
          setBasketOpen(false);
          setError('');
        }}
      />
    </>
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
    pickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    pickBtnText: {
      ...typography.button,
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
    },
    reserved: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    lineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    lineName: {
      ...typography.caption,
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
    },
    linePrice: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    pairRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    pairItem: { flex: 1 },
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
