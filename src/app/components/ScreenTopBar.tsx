import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import WorkspaceSwitcher from '../../features/business/components/WorkspaceSwitcher';
import NotificationBell from '../../features/notifications/components/NotificationBell';
import { useAppTheme } from '../../shared/theme';
import { titleOutline } from '../../shared/theme/textOutline';
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
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      <View style={styles.tools}>
        <NotificationBell />
      </View>
    </View>
  );
};

const createStyles = ({ spacing, colors, typography, activeTheme }: ThemeValue) =>
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
     * Sarlavhaning O'Z SIRTI YO'Q — va bu o'lchov bilan hal qilingan,
     * did bilan emas.
     *
     * Tabletka ikki yonidan 12px joy yeydi. 375px li ekranda qatorda
     * allaqachon almashtirgich (189px) va qo'ng'iroq (48px) turibdi:
     * tabletka bilan "Gap to'yona" ham, "Shaxsiy" ham 2-4 pikselga
     * kesilardi. Kesilgan yozuv — aniq nuqson; sirtsiz matn esa faqat
     * fon bilan kontrast xavfi, va uni KONTUR qoplaydi.
     *
     * Kontur yupqa, shuning uchun o'lcham ham kichik va QALIN: ingichka
     * yirik matnda kontur yetmay qolardi.
     */
    title: {
      ...typography.body,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      /*
       * Sarlavha QISQARMAYDI, ish maydoni nomi qisqaradi.
       *
       * Ekran nomi qisqa va sanoqli ("Gap to'yona"), nom esa uzun
       * bo'lishi mumkin ("Ilhom&Temur&Mirzo") va u allaqachon bir
       * qatorga kesilishga tayyor. Teskarisi bo'lganda uzun nom
       * sarlavhani yeb qo'yardi.
       *
       * Yuqori chegara shunga qaramay bor: tarjimada nom uzun
       * chiqsa ham almashtirgichga joy qolishi kerak.
       */
      flexShrink: 0,
      maxWidth: '40%',
      ...titleOutline(activeTheme === 'dark'),
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
