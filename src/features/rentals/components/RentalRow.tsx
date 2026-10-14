import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import { formatQuantity } from '../../../shared/lib/quantity';
import { FOCUS_INSET } from '../../../shared/ui/focusRing';
import { normalizeApproval, type RentalResponseDTO } from '../types/rental';
import {
  accruedAmount,
  billedUnits,
  formatMoment,
  isPartiallyReturned,
  isOpenEnded,
  overdueUnits,
  remainingQuantity,
  rentalPeriod,
  rentalStage,
  totalQuantity,
  unpaidAmount,
} from '../model/rentalMath';
import { lateLabel, unitCountLabel, unitLabel } from '../model/rentalLabels';

interface RentalRowProps {
  item: RentalResponseDTO;
  isLast?: boolean;
  /**
   * Mijoz ismi qatorda ko'rinsinmi.
   *
   * MIJOZ EKRANIDA o'chiriladi: u yerda butun sahifa bitta odamniki va
   * ismni har qatorda takrorlash qatorni behuda to'ldirardi.
   */
  showClient?: boolean;
  onPress?: (item: RentalResponseDTO) => void;
}

/**
 * Ro'yxatdagi bitta ijara.
 *
 * Chapda buyum nomi va kimdaligi; o'ngda QOLDIQ — bitta raqam va uning
 * ostida nima degani. Ilgari ikki raqam turardi (yig'ilgan va qoldiq)
 * va hech narsa to'lanmagan ijarada ular BIR XIL bo'lib, bitta son ikki
 * marta yozilgandek ko'rinardi. Yig'ilgan summa kartada qoladi.
 *
 * So'z TOMONGA qarab: ombor egasiga "Olinmagan", mijozga "To'lashim
 * kerak". Mijozga egasining tilida gapirish ("olinmagan" — kim
 * olmagan?) ro'yxatni o'qib bo'lmas qilib qo'yardi.
 *
 * Kun soni va kechikish bitta qatorda belgi ("chip") bo'lib turadi:
 * odam ro'yxatni ko'zdan kechirganda avval KECHIKKANLARNI qidiradi.
 */
const RentalRow: React.FC<RentalRowProps> = ({ item, isLast = false, showClient = true, onPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Summa VAQTGA bog'liq, shuning uchun har render'da qaytadan hisoblanadi.
  const period = rentalPeriod(item);
  const stage = rentalStage(item);
  const units = billedUnits(item);
  const late = overdueUnits(item);
  const accrued = accruedAmount(item);
  const unpaid = unpaidAmount(item);

  /**
   * Miqdor qo'shimchasi.
   *
   * Qisman qaytarilganda QOLGANI ham ko'rsatiladi ("× 7/10"): ro'yxatga
   * qarab turib "bu odamda nechta buyum qoldi" degan savolga javob
   * topish mumkin bo'lishi kerak.
   */
  const total = totalQuantity(item);
  const left = remainingQuantity(item);
  // Birlik faqat donadan farq qilsa yoziladi: "Opalubka × 120 m²".
  const unit = item.unit && item.unit !== 'DONA' ? ` ${unitLabel(t, item.unit)}` : '';
  const counted = isPartiallyReturned(item)
    ? `${formatQuantity(left)}/${formatQuantity(total)}`
    : formatQuantity(total);
  const quantity = total > 1 || unit ? ` × ${counted}${unit}` : '';

  /**
   * Tasdiq kutayotgan yozuv — mijoz yozgan, egasi hali tasdiqlamagan.
   *
   * Ro'yxatda ALOHIDA ko'rinadi: u ombordan band qilmagan va puli ham
   * hisoblanmayapti, ya'ni egasi uchun "bajarilmagan ish".
   */
  const waiting = normalizeApproval(item.approval) === 'WAITING';

  /** Ombor meniki bo'lsa pul OLINADI, birovniki bo'lsa TO'LANADI. */
  const mine = item.owner !== false;

  /**
   * Rang bosqichga qarab: kechikkan — qizil, NASIYA (buyum qaytgan, puli
   * olinmagan) — sariq, yopilgan — kulrang. Nasiya kechikkandan alohida
   * rangda: buyum endi omborda, faqat pul undirilishi kerak.
   */
  const statusTone =
    stage === 'OVERDUE'
      ? colors.negative
      : stage === 'DEBT'
        ? colors.secondary
        : stage === 'CLOSED'
          ? colors.textSecondary
          : colors.positive;

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.itemName} — ${item.clientName}`}
      dataSet={FOCUS_INSET}
    >
      {/* Holat ustuni: ro'yxatni ko'zdan kechirishda rang birinchi ko'rinadi. */}
      <View style={[styles.statusBar, { backgroundColor: statusTone }]} />

      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {item.itemName}
          {quantity}
        </Text>

        <View style={styles.metaRow}>
          {showClient ? (
            <View style={styles.meta}>
              <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.clientName}
              </Text>
            </View>
          ) : null}

          <View style={styles.meta}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{unitCountLabel(t, period, units)}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {waiting ? (
            <View style={[styles.badge, { backgroundColor: colors.infoSoft }]}>
              <Text style={[styles.badgeText, { color: colors.info }]}>
                {t('rentals.waitingShort')}
              </Text>
            </View>
          ) : null}
          {stage === 'CLOSED' ? (
            <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {t('rentals.returned')}
              </Text>
            </View>
          ) : stage === 'DEBT' ? (
            <View style={[styles.badge, { backgroundColor: `${colors.secondary}26` }]}>
              <Text style={[styles.badgeText, { color: colors.secondary }]}>
                {t('rentals.debtBadge')}
              </Text>
            </View>
          ) : late > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.negativeSoft }]}>
              <Text style={[styles.badgeText, { color: colors.negative }]}>
                {lateLabel(t, period, late)}
              </Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: colors.positiveSoft }]}>
              <Text style={[styles.badgeText, { color: colors.positive }]}>
                {/* Muddatsiz ijarada sana ko'rsatilmaydi: u kelishuv
                    emas va "shu kungacha" deb o'qilib yolg'on bo'lardi. */}
                {isOpenEnded(item)
                  ? t('rentals.openEnded')
                  : t('rentals.dueOn', {
                      date: formatMoment(item.dueDate, period === 'HOUR' ? item.dueTime : null),
                    })}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/*
        O'ngda BITTA raqam: hal qilinmagan qoldiq. Hisob yopilgan bo'lsa
        o'rniga jami yig'ilgan summa turadi — "0" yozib qo'yish odamni
        ortiqcha o'ylantirardi.
      */}
      <View style={styles.side}>
        {/* Tasdiq kutayotgan yozuvda summa SO'NIQ: u hali kelishuv emas,
            balansga ham kirmaydi. Qizil raqam uni haqiqiy qarzdek
            ko'rsatib, "Kutilmoqda" belgisiga qarama-qarshi chiqardi. */}
        <Text
          style={[
            styles.accrued,
            waiting && styles.pendingAmount,
            !waiting && unpaid !== 0 && { color: unpaid > 0 ? colors.negative : colors.positive },
          ]}
          numberOfLines={1}
        >
          {formatMoney(unpaid !== 0 ? Math.abs(unpaid) : accrued, item.currency)}
        </Text>
        <Text style={styles.unpaid} numberOfLines={1}>
          {unpaid === 0
            ? t('rentals.settled')
            : unpaid > 0
              ? mine
                ? t('rentals.unpaid')
                : t('rentals.toPay')
              : t('rentals.advance')}
        </Text>
      </View>
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    statusBar: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: radius.pill,
    },
    main: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xxs,
    },
    side: {
      alignItems: 'flex-end',
      maxWidth: '42%',
      flexShrink: 1,
      gap: 1,
    },
    name: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
      minWidth: 0,
    },
    metaText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    badge: {
      paddingVertical: 2,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.pill,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
    },
    accrued: {
      ...typography.body,
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    // Tasdiqlanmagan summa: o'qiladi, lekin e'tibor tortmaydi.
    pendingAmount: {
      color: colors.textSecondary,
      fontWeight: '700',
    },
    // Raqam ostidagi SO'Z: rang raqamda, bu yerda emas — ikkisi ham
    // rangli bo'lsa qator chaqnab ketardi.
    unpaid: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });

export default memo(RentalRow);
