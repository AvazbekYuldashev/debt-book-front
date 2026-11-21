import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import WorkspaceSwitcher from '../../features/business/components/WorkspaceSwitcher';
import NotificationBell from '../../features/notifications/components/NotificationBell';
import { useAppTheme } from '../../shared/theme';
import { TOP_BAR_PILL_HEIGHT } from '../../shared/ui/topBarLayout';
import type { ThemeValue } from '../../shared/theme/ThemeProvider';

interface ScreenTopBarProps {
  /**
   * Ekran nomi — almashtirgich bilan bildirishnoma tugmasi ORASIDA.
   *
   * Sarlavha shu qatorga chiqqanda ekranning o'zida bitta blok kamayadi
   * va ro'yxatga shuncha joy ochiladi. Berilmasa qator avvalgidek
   * ikki elementdan iborat bo'ladi — Qarzlar ekranida sarlavha yo'q.
   */
  title?: string;
}

/**
 * Barcha bosh ekranlarning eng yuqori qatori: chapda ish maydoni
 * almashtirgichi, o'ngda bildirishnoma tugmasi.
 *
 * ATAYIN yagona komponent. Ilgari bu qator har ekranda alohida yozilgandi va
 * ular sekin-asta bir-biridan farq qila boshlagandi — tugma bir joyda
 * yuqoriga yopishib, boshqasida pastroqda turardi. Joylashuvni bitta joyda
 * saqlash — buni qayta takrorlanishidan himoya qiladi.
 *
 * Yuqoridan bo'shliq shu yerda beriladi: ekran konteyneri status bar
 * xavfsiz-zonasidan keyin darhol boshlanadi, qo'shimcha nafas joyisiz
 * tugma ekran chetiga qadalib qolardi.
 *
 * OVOZLI BUYRUQ TUGMASI BU YERDA EMAS. U pastki panelning o'rtasiga
 * ko'chdi: telefon kattalashgani sayin yuqori o'ng burchak barmoq
 * yetmaydigan joyga aylandi, bu tugma esa ilovaning eng tez-tez
 * bosiladigan amali.
 */
const ScreenTopBar: React.FC<ScreenTopBarProps> = ({ title }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      {/* Almashtirgich ham qisqara oladi: uning nomi uzun bo'lishi mumkin
          va qisqarmasa, sarlavhaga joy umuman qolmasdi. Ichkarida nom
          allaqachon bir qatorga kesiladi. */}
      <View style={styles.switcher}>
        <WorkspaceSwitcher />
      </View>
      {/* Sarlavha ikki yon element ORASIDA va faqat o'zi qisqaradi:
          ish maydoni nomi uzun bo'lsa, u kesilmasligi kerak — odam qaysi
          hisobda turganini bilishi ekran nomidan muhimroq. */}
      {title ? (
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
      <View style={styles.tools}>
        <NotificationBell />
      </View>
    </View>
  );
};

const createStyles = ({ spacing, radius, colors, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      // Oraliq va o'ng chekinish ATAYIN tor: qatorda uch element bor va
      // 375px li ekranda har ortiqcha piksel sarlavhani kesilishga
      // majbur qilardi.
      gap: spacing.xxs,
      // Chapdagi gorizontal chekinishni WorkspaceSwitcher o'zi beradi.
      paddingRight: spacing.sm,
      paddingTop: spacing.xxs + 2,
    },
    /**
     * Sarlavha O'Z SIRTIDA — yonidagi ikki element bilan bir xil qoida.
     * Kontur (matn soyasi) sinab ko'rilgan va yetmaydi: u ingichka, to'q
     * fotosurat ustida to'q matnni qutqarmaydi.
     *
     * Shrift O'LCHOV bilan tanlangan. 375px li ekranda qatorda
     * almashtirgich (193px) va qo'ng'iroq (52px) bor; oraliq va o'ng
     * chekinish bilan sarlavhaga ~110px qoladi, tabletka esa yon
     * tomonlardan 16px yeydi.
     *
     * Yuqori chegara shu: 17px da matn 100px ga chiqadi va oshgan
     * piksellar almashtirgichdan olinadi — o'lchab ko'rilgan,
     * "Shaxsiy" o'sha zahoti kesilgan.
     *
     * Sarlavha QISQARMAYDI, ish maydoni nomi qisqaradi: ekran nomi
     * qisqa va sanoqli, nom esa "Ilhom&Temur&Mirzo" bo'lishi mumkin va
     * u allaqachon bir qatorga kesilishga tayyor. Teskarisi bo'lganda
     * uzun nom sarlavhani yeb qo'yardi. Yuqori chegara shunga qaramay
     * bor: tarjimada nom uzun chiqsa ham almashtirgichga joy qolsin.
     */
    titleWrap: {
      // Balandlik va shakl chapdagi almashtirgich bilan BIR XIL: uchala
      // sirt bitta to'plamdek ko'rinishi kerak.
      minHeight: TOP_BAR_PILL_HEIGHT,
      justifyContent: 'center',
      paddingHorizontal: spacing.xxs,
      borderRadius: radius.pill,
      ...glass.surface,
      flexShrink: 0,
      /*
       * UZUNLIK FOIZDA, pikselda emas.
       *
       * Eng pastki chegara tabletkani matndan uzunroq qiladi: "Qarzlar"
       * kabi qisqa nom o'z harflariga yopishib, yonidagi yirik
       * almashtirgich bilan solishtirganda siqilgandek ko'rinardi.
       * Matn markazda, ya'ni tabletka ikki tomonga teng cho'ziladi.
       *
       * Yuqori chegara esa aksincha ushlab turadi: keng brauzer oynasida
       * chegarasiz tabletka qatorni egallab ketardi, tor telefonda esa
       * almashtirgichga joy qolmasdi.
       *
       * Ikkisi ham foiz, chunki xavf ekran ENIGA bog'liq: 560px da 28%
       * — 157px, 375px da 105px, ya'ni tabletka ekran bilan birga
       * kichrayadi va hech qachon qatorni bosib qolmaydi.
       *
       * Aynan 28: 375px da 30% (112px) qo'yilganda almashtirgichga
       * yetmay qolib, "Shaxsiy" bir necha pikselga kesilgan edi.
       *
       * Yon chekinish ham shu sababdan tor (4px): eng tor telefonda
       * (360px) qator aynan to'ladi va har ortiqcha piksel
       * almashtirgichdan olinardi. Qisqa nomlarda tabletka uzunligini
       * baribir chekinish emas, eng pastki chegara belgilaydi.
       */
      minWidth: '28%',
      maxWidth: '40%',
    },
    title: {
      ...typography.body,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    /**
     * Almashtirgich QISQARA OLADI, sarlavha esa yo'q.
     *
     * Ichkarida nom allaqachon bir qatorga kesiladi, ya'ni joy
     * yetmaganda yo'l beradigan tomon aynan shu. Teskarisi bo'lganda
     * ekran nomi kesilardi — u esa qisqa va sanoqli.
     */
    switcher: {
      flexShrink: 1,
      minWidth: 0,
    },
    tools: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
  });

export default memo(ScreenTopBar);
