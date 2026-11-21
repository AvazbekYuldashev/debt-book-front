import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, withAlpha } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import { canConvertAll, netInBase } from '../../../shared/lib/currency';
import type { Currency, CurrencyAmounts } from '../../../shared/lib/currency';
import { useCurrency } from '../context/CurrencyContext';

interface BalanceHeroProps {
  totalDebt: CurrencyAmounts;
  totalCredit: CurrencyAmounts;
  /** Asosiy valyuta — katta raqam shu valyutada chiqadi. */
  currency: Currency;
  /** Tafsilot kartasi — hero ICHIDA, uning rangi ustida turadi. */
  children?: React.ReactNode;
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
 *
 * Tafsilot kartasi (qarz | haq) hero ICHIDA, `children` bo'lib keladi.
 * Ilgari u tashqarida turib manfiy chekinish bilan hero ustiga MINARDI:
 * shunda hero kartasining pastki qirrasi tafsilot kartasini kesib o'tar
 * va yarim shaffof sirt ostida qattiq chiziq bo'lib ko'rinardi — ikki
 * qatlam bir-biriga yopishgandek emas, ustma-ust tashlangandek edi.
 * Endi hero rangi tafsilot kartasining TAGIDA to'liq davom etadi:
 * kesuvchi chegara yo'q, blok yaxlit ko'rinadi. (Web'da buni
 * `backdrop-filter` xiralashtirib yashirardi, telefonda esa bunday CSS
 * yo'q — shuning uchun farq aynan telefonda ko'zga tashlanardi.)
 */
const BalanceHero: React.FC<BalanceHeroProps> = ({ totalDebt, totalCredit, currency, children }) => {
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

      {children ? <View style={styles.detail}>{children}</View> : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows }: ThemeValue) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.xxl,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      // Tafsilot kartasi ostidagi ramka — yon chekinish bilan bir xil,
      // shunda rangli hoshiya karta atrofida teng aylanadi.
      paddingBottom: spacing.md,
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
    /**
     * Tafsilot kartasining hero ichidagi o'rni va uning MUSTAHKAM ASOSI.
     *
     * Yon chekinish YO'Q: kartaning o'zi hero'ning `paddingHorizontal`
     * ichida turadi va rangli hoshiya shundan chiqadi.
     *
     * Asos sirti SHART. Tafsilot kartasi yarim shaffof shisha va endi u
     * butunlay hero rangi ustida yotadi: asossiz qoldirilsa, yorug'
     * mavzuda qizil qarz raqami yashil hero ustiga tushib, kontrast
     * 2.3:1 ga qulardi — raqam o'qilmay qolardi.
     *
     * Asos ATAYIN yarim shaffof: to'liq yopiq bo'lsa hero rangi umuman
     * sezilmay, ichkarida oddiy oq karta turardi — blok yana ikkiga
     * bo'linardi. Shu qiymatda hero tusi yengil sezilib turadi, qarz va
     * haq raqamlari esa 3.9:1 dan past tushmaydi (yirik qalin matn
     * uchun yetarli, yorliqlar 5:1 dan yuqori).
     *
     * Radius tafsilot kartasiniki bilan bir xil bo'lishi kerak, aks
     * holda burchaklarda asos sirti chiqib qoladi.
     */
    detail: {
      marginTop: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: withAlpha(colors.surface, 0.7),
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
