import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import { canConvertAll, netInBase } from '../../../shared/lib/currency';
import type { Currency, CurrencyAmounts } from '../../../shared/lib/currency';
import { useCurrency } from '../context/CurrencyContext';

/**
 * Tafsilot kartasi hero ustiga QANCHA minadi.
 *
 * Bitta joyda turadi va ikkala tomon ham shundan o'qiydi: hero shuncha
 * pastki bo'shliq qoldiradi, ekran esa shuncha salbiy chekinish beradi.
 * Ikki joyda ikki son bo'lganda ular ajralib, belgi karta ostida
 * ko'rinmay qolgan edi.
 */
export const HERO_OVERLAP = 32;

interface BalanceHeroProps {
  totalDebt: CurrencyAmounts;
  totalCredit: CurrencyAmounts;
  /** Asosiy valyuta — katta raqam shu valyutada chiqadi. */
  currency: Currency;
  /**
   * Kurs satridan keyin qo'shiladigan QO'SHIMCHA izoh.
   *
   * Katta raqam nimani QAMRAMAGANINI aytish uchun: Gap to'yonada
   * birliklar (kg, dona, litr) pulga aylantirilmaydi va jamlanmaydi,
   * shuning uchun u yerda bu raqam faqat pul bo'yicha. Izohsiz
   * "Umumiy balans 0 so'm" deb turishi odamni chalg'itardi.
   *
   * Qarzlar ekranida berilmaydi — u yerda qamrab olinmagan narsa yo'q.
   */
  note?: string;
}

/**
 * Ekranning ENG TEPADAGI kartasi: bitta katta raqam — umumiy balans.
 *
 * Ilgari ekran darhol ikki katakli (qarz | haq) karta bilan boshlanardi
 * va odam "ahvolim qalay" degan savolga javob olish uchun ikkita raqamni
 * o'zi ayirishi kerak edi. Endi tepada YAKUNIY raqam turadi, qarz va haq
 * esa uning ostidagi kartada tafsilot bo'lib qoladi.
 *
 * Valyutalar MARKAZIY BANK kursida jamlanadi: dollar va rubl so'mga
 * aylantirilib, bitta yakuniy raqam chiqadi (egasining talabi — ilgari
 * bu yerda faqat so'm turardi va boshqa valyutalar yo'qolgandek
 * ko'rinardi). Har valyutaning O'Z qatori pastdagi tafsilot kartasida
 * qoladi: kurs taxminiy, aniq raqam o'z valyutasida ko'rinishi kerak.
 *
 * Kurs kelmagan bo'lsa jamlanmaydi — faqat asosiy valyuta ko'rsatiladi.
 * Kurssiz konvertatsiya summani o'zgartirmay qaytaradi va 5 000 dollar
 * 5 000 so'm bo'lib qo'shilib ketardi.
 *
 * Yo'nalish belgisi SARLAVHA QATORIDA, o'ng chetda: u pastda turganda
 * ostidagi karta uni yopib qo'yardi va "Qarz" so'zi yarmigacha
 * kesilgan holda ko'rinardi.
 */
const BalanceHero: React.FC<BalanceHeroProps> = ({ totalDebt, totalCredit, currency, note }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { rates } = useCurrency();

  // Kurs yetarli bo'lsagina jamlanadi (izohi `canConvertAll` da).
  const combined =
    canConvertAll(totalCredit, currency, rates) && canConvertAll(totalDebt, currency, rates);
  const net = combined
    ? netInBase(totalCredit, totalDebt, currency, rates)
    : (totalCredit[currency] ?? 0) - (totalDebt[currency] ?? 0);
  const positive = net >= 0;

  /*
   * KARTA RANGI yo'nalishni aytadi: haq — yashil, qarz — qizil.
   *
   * Ilgari karta doim bitta rangda edi va "men qarzdorman" yoki
   * "menga qarzdor" degan farq faqat kichkina belgida ko'rinardi —
   * ekranga qaragan odam darhol anglamasdi. Ro'yxatdagi qatorlar
   * allaqachon shu ikki rangda gapiradi.
   */
  const tone = positive ? colors.positive : colors.negative;

  return (
    <View style={[styles.card, { backgroundColor: tone }]}>
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Ionicons name="wallet-outline" size={17} color={colors.textOnPrimary} />
          <Text style={styles.label} numberOfLines={1}>
            {t('debts.totalBalance')}
          </Text>
        </View>

        {/* Yo'nalish — raqamning o'zi ishorasiz chiqadi, shuning uchun
            "haq" yoki "qarz" ekanini so'z aytadi. */}
        <View style={styles.badge}>
          <Ionicons
            name={positive ? 'trending-up' : 'trending-down'}
            size={12}
            color={colors.textOnPrimary}
          />
          <Text style={styles.badgeText} numberOfLines={1}>
            {positive ? t('money.badgeCredit') : t('money.badgeDebt')}
          </Text>
        </View>
      </View>

      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {formatMoney(Math.abs(net), currency)}
      </Text>

      {/* Raqam qaysi kursda chiqqani AYTILADI: jamlangan summa taxminiy
          va odam buni bilishi kerak. Kurs kelmagan bo'lsa satr ham
          chiqmaydi — u holda raqam faqat asosiy valyutaniki. */}
      {combined ? (
        <Text style={styles.note} numberOfLines={1}>
          {rates?.date
            ? t('debts.cbRateOn', { date: rates.date })
            : t('debts.cbRate')}
        </Text>
      ) : null}

      {note ? (
        <Text style={styles.note} numberOfLines={1}>
          {note}
        </Text>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows }: ThemeValue) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.xxl,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      // Ostidagi karta minadigan joy + bir oz nafas. Nafas ATAYIN tor:
      // kartadan pastda hero rangining ingichka chizig'i ko'rinsa
      // yetarli, undan ortig'i ro'yxatdan joy yeydi.
      paddingBottom: HERO_OVERLAP + spacing.xxs,
      marginHorizontal: spacing.md,
      ...shadows.card,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexShrink: 1,
      minWidth: 0,
    },
    label: {
      ...typography.body,
      fontSize: 15,
      color: colors.textOnPrimary,
      opacity: 0.9,
    },
    amount: {
      ...typography.heading1,
      fontSize: 27,
      // Qator balandligi SHRIFTGA moslandi: `heading1` dan kelgan 40px
      // 27px li raqam uchun ortiqcha edi va har ekranda 6px bekorga
      // ketardi.
      lineHeight: 34,
      fontWeight: '800',
      color: colors.textOnPrimary,
      marginTop: spacing.xxs,
      fontVariant: ['tabular-nums'],
    },
    /**
     * Belgi KARTA USTIDA turadi, shuning uchun foni mavzu rangi emas,
     * shaffof oq: yo'nalish qaysi tomonda bo'lishidan qat'i nazar matn
     * o'qiladi (yashil fonda "Qarz" so'zi chalkash edi).
     */
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: spacing.xs + 2,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
    },
    note: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textOnPrimary,
      opacity: 0.75,
      marginTop: 2,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textOnPrimary,
    },
  });

export default memo(BalanceHero);
