import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import WorkspaceSwitcher from '../../features/business/components/WorkspaceSwitcher';
import NotificationBell from '../../features/notifications/components/NotificationBell';
import { useAppTheme } from '../../shared/theme';
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
      // Oraliq ATAYIN tor: qatorda uch element bor va 375px li ekranda
      // 12px lik oraliqlar sarlavhani kesilishga majbur qilardi.
      gap: spacing.xs,
      // Chapdagi gorizontal chekinishni WorkspaceSwitcher o'zi beradi.
      paddingRight: spacing.md,
      paddingTop: spacing.xxs + 2,
    },
    /**
     * Sarlavha O'Z SIRTIDA — yonidagi ikki element bilan bir xil qoida.
     * Kontur (matn soyasi) sinab ko'rilgan va yetmaydi: u ingichka, to'q
     * fotosurat ustida to'q matnni qutqarmaydi.
     *
     * Chekinish va o'lcham O'LCHOV bilan tanlangan. 375px li ekranda
     * qatorda almashtirgich (193px) va qo'ng'iroq (48px) bor; oraliq va
     * o'ng chekinish bilan sarlavhaga 102px qoladi. Tabletka yon
     * tomonlardan 8px yeydi, ya'ni matnga 94px. 16px da "Gap to'yona"
     * aynan 94px — zaxira nolga teng va ekran bir piksel tor bo'lsa
     * yozuv kesilardi. Shuning uchun 15px: matn 88px, zaxira 6px.
     *
     * Sarlavha QISQARMAYDI, ish maydoni nomi qisqaradi: ekran nomi
     * qisqa va sanoqli, nom esa "Ilhom&Temur&Mirzo" bo'lishi mumkin va
     * u allaqachon bir qatorga kesilishga tayyor. Teskarisi bo'lganda
     * uzun nom sarlavhani yeb qo'yardi. Yuqori chegara shunga qaramay
     * bor: tarjimada nom uzun chiqsa ham almashtirgichga joy qolsin.
     */
    titleWrap: {
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.xxs,
      borderRadius: radius.lg,
      ...glass.surface,
      flexShrink: 0,
      maxWidth: '40%',
    },
    title: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
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
