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
import {
  elapsedLabel,
  lateLabel,
  perPeriodLabel,
  unitCountLabel,
  unitLabel,
} from '../model/rentalLabels';

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
 * SO'Z — ilovaning qarz lug'ati: HAQ (menga tegishli pul) yoki QARZ
 * (men to'laydigan pul), hisob yopilgan bo'lsa nol. Aynan shu ikki so'z
 * kontakt sarlavhasida ham turadi ("Hozirgi haq"), shuning uchun endi
 * sarlavha bilan qator bitta tilda gapiradi — ilgari ro'yxat "olinmagan"
 * derdi va mijoz uchun bu "kim olmagan?" degan savol edi.
 *
 * Yo'nalish EGALIKDAN chiqadi: ombor meniki bo'lsa to'lanmagan ijara
 * menga tegishli (haq), birovniki bo'lsa men to'layman (qarz). Ortiqcha
 * to'lov esa buni teskari aylantiradi — shu bitta shart ikkala tomonni
 * ham, ikkala yo'nalishni ham qamrab oladi.
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

  /*
   * Bu pul MENGA tegishlimi (haq) yoki men to'laymanmi (qarz).
   *
   * `rentalBalance.ts` dagi shart bilan AYNI BIR XIL: qator qanday
   * yozsa, balansga ham shunday tushadi.
   */
  const credit = unpaid > 0 === mine;

  /**
   * Rang bosqichga qarab: kechikkan — qizil, yopilgan — kulrang,
   * mijozda — yashil.
   *
   * NASIYA rangi olib tashlandi: u bosqich sifatida ham yo'q (izohi
   * `rentalMath.rentalStage` da). Pul holati o'ng ustunda qoladi.
   */
  const statusTone =
    stage === 'OVERDUE'
      ? colors.negative
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
          ) : late > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.negativeSoft }]}>
              <Text style={[styles.badgeText, { color: colors.negative }]}>
                {lateLabel(t, period, late)}
              </Text>
            </View>
          ) : isOpenEnded(item) ? (
            /*
             * MUDDATSIZ ijara: sana o'rniga O'TGAN VAQT va narx.
             *
             * Ilgari bu yerda "Muddat belgilanmagan" turardi — u rost,
             * lekin hech narsa aytmasdi: buyum bir kundan beri
             * mijozdami yoki olti oydanmi, qator bir xil ko'rinardi va
             * hech qayerda belgi chiqmasdi (kelishilgan muddat yo'q,
             * demak "kechikdi" ham bo'lmaydi).
             *
             * Narx ham shu yerda: qatorning o'ng tomonida JAMI summa
             * turadi, birlik narxi esa umuman ko'rinmasdi — "25 000
             * so'm kuniga" bo'lmasa, "5 kundan oshdi" raqami nimadan
             * kelganini tushunib bo'lmasdi.
             *
             * Rang OGOHLANTIRUVCHI emas, XABAR beruvchi: kechikish
             * yo'q, shunchaki diqqatga olinadigan ma'lumot.
             */
            <View style={[styles.badge, { backgroundColor: colors.infoSoft }]}>
              <Text style={[styles.badgeText, { color: colors.info }]}>
                {`${elapsedLabel(t, period, units)} · ${formatMoney(item.price, item.currency)} ${perPeriodLabel(t, period)}`}
              </Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: colors.positiveSoft }]}>
              <Text style={[styles.badgeText, { color: colors.positive }]}>
                {t('rentals.dueOn', {
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
        {/* Hisob yopilgan bo'lsa NOL yoziladi, yig'ilgan summa emas:
            "hamma narsa to'landi" degani aynan nol, boshqa raqam esa
            yana nimadir qolgandek o'qiladi. */}
        <Text
          style={[
            styles.accrued,
            unpaid !== 0 && { color: credit ? colors.positive : colors.negative },
          ]}
          numberOfLines={1}
        >
          {formatMoney(Math.abs(unpaid), item.currency)}
        </Text>
        <Text style={styles.unpaid} numberOfLines={1}>
          {unpaid === 0
            ? t('rentals.settled')
            : credit
              ? t('money.badgeCredit')
              : t('money.badgeDebt')}
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
