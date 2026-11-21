import { StyleSheet } from 'react-native';
import type { ThemeValue } from '../theme/ThemeProvider';

/**
 * "Qarz | Haq" ikki katakli tafsilot kartasining YAGONA o'lchov manbai.
 *
 * Ikki ekran bu kartani ko'rsatadi — Qarzlar (`BalanceSummary`) va Gap
 * to'yona (`GapSummaryCard`) — va ular BIR XIL ko'rinishi talab. Ilgari
 * har biri o'z o'lchamini yozardi: ikonka 30 va 22, yorliq 13 va 11,
 * summa 24 va 15 piksel bo'lib ketgan edi. Endi o'lcham bitta joyda,
 * ya'ni birini o'zgartirish ikkinchisini ham o'zgartiradi.
 *
 * Kartaning O'ZI (sirt, ichki bo'shliq, chekinish) bu yerda emas: unga
 * har ekranning o'z qo'shimchasi bor — Qarzlarda "Standart tartib"
 * tugmasi, Gap'da "Yana N ta" va birlik chiplari.
 *
 * KATAK TARTIBI ham shu yerda yoziladi, chunki u ham ko'rinish qoidasi:
 * QARZ CHAPDA, HAQ O'NGDA. Ikki ekranda ikki xil bo'lganda, odam
 * bo'limni almashtirgach ranglarni teskari o'qiy boshlardi.
 */

// Asosiy summa: keng ekranda 24px gacha, tor ekranda 13px gacha kichrayadi.
// Yuqori chegara ATAYIN pasaytirilgan — bir nechta valyuta ko'rsatilganda
// karta ekranning yarmini egallab, ro'yxatga joy qoldirmasdi.
export const VALUE_FONT_MAX = 24;
export const VALUE_FONT_MIN = 13;
// Qalin, tabular-nums summa satri uchun o'rtacha belgi eni ≈ shriftning shuncha ulushi.
const AVG_CHAR_RATIO = 0.58;
// Summa blokining ichki gorizontal bo'shlig'i (aktiv holatda ham o'zgarmaydi).
export const BLOCK_RESERVED = 16;
// Ajratuvchi chiziq va uning yon bo'shliqlari (katak eni hisobi uchun).
export const DIVIDER_SPACE = 33;

/**
 * Summa shriftini MAVJUD ENGA qarab hisoblaydi: keng ekranda to'liq o'lcham
 * (VALUE_FONT_MAX), tor ekranda kerak bo'lgandagina kichrayadi (VALUE_FONT_MIN
 * gacha). Faqat uzunlikka qarash keng ekranda ham mayda qilib yuborardi.
 * `adjustsFontSizeToFit` web'da (react-native-web) ishlamaydi — shuning uchun qo'lda.
 *
 * `longestLength` — kartadagi ENG UZUN summa satri: barcha qatorlar (ikkala
 * tomonda ham) BIR XIL shrift oladi, aks holda uzun satr yonidagilardan kichik
 * bo'lib, xunuk ko'rinardi.
 */
export const valueFontSize = (longestLength: number, availWidth: number): number => {
  if (!longestLength || availWidth <= 0) return VALUE_FONT_MAX;
  const fitted = Math.floor(availWidth / (longestLength * AVG_CHAR_RATIO));
  return Math.max(VALUE_FONT_MIN, Math.min(VALUE_FONT_MAX, fitted));
};

/** Qator enidan bitta katakning summa uchun qoladigan enini chiqaradi. */
export const tileContentWidth = (rowWidth: number): number =>
  rowWidth > 0 ? (rowWidth - DIVIDER_SPACE) / 2 - BLOCK_RESERVED : 0;

export const createBalanceTileStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    tilesRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    tile: {
      flex: 1,
      minWidth: 0,
    },
    tileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    icon: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...typography.bodySmall,
      fontSize: 13,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    amountBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      alignSelf: 'flex-start',
      maxWidth: '100%',
      paddingHorizontal: spacing.xxs,
      marginLeft: -spacing.xxs,
      borderRadius: radius.md,
    },
    amountBlockPressed: {
      opacity: 0.55,
    },
    value: {
      ...typography.amount,
      lineHeight: 24,
      flexShrink: 1,
    },
    valueIdle: {
      color: colors.textSecondary,
    },
    // Ikki katak orasidagi vertikal ajratgich — juda nozik, "qattiq" border emas.
    divider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
      marginHorizontal: spacing.md,
    },
  });
