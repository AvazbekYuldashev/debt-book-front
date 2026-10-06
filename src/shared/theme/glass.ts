import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import type { ColorTokens } from './colors';
import type { ShadowTokens } from './elevation';
import { DEFAULT_TRANSPARENCY, glassAlpha, reAlpha, type TransparencyLevel } from './transparency';

// ============================================================
//  "Shisha" sirtlar — ilovaning ikkinchi imzo qatlami.
//
//  Ilgari kartalar QUYUQ oq edi va ambient fon (barglar, tepaliklar) faqat
//  ular ORASIDA ko'rinardi. Endi kartaning o'zi yarim shaffof: fon ular
//  ostidan xira o'tib turadi, ekran esa yagona kompozitsiyaga aylanadi.
//
//  Uch qatlamli retsept — uchalasi ham SHART:
//    1) yarim shaffof fon   — ostidagi rasm ko'rinadi;
//    2) nozik yorug' chegara — aks holda shisha "chetsiz dog'" bo'lib qoladi;
//    3) yumshoq soya        — sirtni fondan ajratadi.
// ============================================================

export interface GlassTokens {
  /** Odatiy karta/blok. Blur YO'Q — pastdagi izohga qarang. */
  surface: ViewStyle;
  /**
   * Ko'tarilgan STATIK sirt: modal, summary karta. Bu yerda blur bor.
   * Qorong'ida TUSI `surface` nikidan och (to'q fonda och yoki teng
   * chiqadi) - to'q bo'lsa "teshik" ko'rinadi.
   */
  raised: ViewStyle;
  /**
   * Ichki bo'lak: klavisha, chip, ajratilgan maydon. Soyasiz, blursiz.
   * Ota-sirtdan bir pog'ona ko'tarilgan; qorong'ida HAR darajada to'q
   * qoladi (alfani jadval almashtiradi, tus esa to'q chip).
   */
  muted: ViewStyle;
  /**
   * `surface` ning SOYASIZ varianti.
   *
   * Mavjud bloklarga qo'llash uchun: ularning ko'pchiligida allaqachon o'ziga
   * xos soya bor (masalan pastki navigatsiya soyasi YUQORIGA tushadi). Tayyor
   * `surface` ni ustiga qo'yish ikkinchi soya qatlamini qo'shib yuborardi.
   */
  pane: ViewStyle;
  /**
   * Ekran CHETIGA tekkan sirt uchun: shaffof fon, lekin CHEGARASIZ.
   *
   * Chegara faqat to'rt tomoni ham ko'rinadigan blokda ma'noli. Pastki
   * navigatsiya yoki pastdan chiqadigan sheet esa ekranning yon va pastki
   * chetiga tegib turadi va faqat YUQORI burchaklari yumaloq: o'rab olgan
   * chegara yon tomonlarda pastga ketadi va radius tugagan nuqtada ko'zga
   * tashlanadigan "siniq" hosil qiladi. Bu sirtlarni fondan soya ajratadi.
   */
  flush: ViewStyle;
  /**
   * Modal (dialog) kartasi — QAT'IY SHAFFOF EMAS.
   *
   * `raised` shaffof bo'lib, "shisha" taassurotini `backdropFilter` blur
   * beradi. Lekin u FAQAT web'da ishlaydi (react-native-web CSS'i) —
   * Android/iOS'da blur umuman yo'q va modal shunchaki yarim shaffof
   * panelga aylanib qolardi: ortidagi ro'yxat, summalar va tugmalar
   * matn ustidan ko'rinib, o'qib bo'lmas darajada aralashib ketardi.
   *
   * Shuning uchun dialoglar mustahkam fonda: matn har doim o'qiladi,
   * diqqat esa scrim tufayli baribir modalda qoladi.
   */
  modal: ViewStyle;
  /** Modal ortidagi qatlam: qoraytirish + xiralashtirish. */
  scrim: ViewStyle;
  /**
   * Faqat "muzlatish" - ortdagi rasmni xiralashtirish (web, fon rasmi
   * ustida). surface/pane/flush'da allaqachon bor; sirt rangini to'liq
   * token o'rniga faqat `backgroundColor` orqali oladigan joylar (ro'yxat
   * qatorlari) uchun alohida beriladi.
   */
  frost: ViewStyle;
}

/**
 * Orqa fonni xiralashtirish (faqat web).
 *
 * `backdrop-filter` sirt ORQASIDAGI piksellarni xiralashtiradi (RNW
 * `-webkit-` prefiksini o'zi qo'yadi). Native'da bunday imkoniyat qo'shimcha
 * kutubxonasiz yo'q — u yerda xiralik yarim shaffoflikning o'zidan chiqadi.
 * `expo-blur` native qayta build talab qilardi, ambient fon esa past
 * kontrastli: farq deyarli sezilmaydi, narx esa yuqori.
 *
 * `saturate` blur bilan birga beriladi: xiralashgan piksellar rangi so'nadi,
 * to'yinganlikni ko'tarish fonning yashil-ko'k tusini tirik saqlaydi.
 */
const backdrop = (amount: number): ViewStyle =>
  Platform.OS === 'web'
    ? ({ backdropFilter: `blur(${amount}px) saturate(150%)` } as ViewStyle)
    : {};

/**
 * Fon rasmi ustidagi muzli shisha kuchi.
 *
 * Fon rasmi "Xiralik: Yo'q" da KESKIN qoladi - Samsung'dagidek. Sirt esa
 * ortidagi rasmni o'zi xiralashtiradi: rasmning ranglari o'tadi, mayda
 * detallari (yoriqlar, nuqtalar) matnga aralashmaydi.
 */
const FROST_BLUR = 20;

/**
 * Web'da sirt ortidagi rasmni muzlata olamiz; telefonda - yo'q.
 * Chaqiruv paytida o'qiladi (modul yuklanganda emas): testlar web yo'lini
 * ham tekshira olsin.
 */
const canFrost = () => Platform.OS === 'web';

/**
 * Rasm ustidagi muzlatish: blur + yengil yorqinlik tuzatishi.
 *
 * "Ko'p" da sirt TO'LIQ shaffof - tus yo'q, matn rasmning o'zi ustida.
 * Yorqinlik tuzatishi tus emas (rang qo'shmaydi): to'q ko'rinishda ortdagi
 * rasmni biroz qoraytiradi (oq yozuv uchun), yorug'ida biroz oqartiradi
 * (to'q yozuv uchun) - Apple'ning "vibrancy" si kabi.
 */
const photoFrost = (amount: number, isDark: boolean): ViewStyle =>
  canFrost()
    ? ({
        backdropFilter: `blur(${amount}px) saturate(140%) brightness(${isDark ? 0.85 : 1.1})`,
      } as ViewStyle)
    : {};

/**
 * @param onPhoto foydalanuvchi fon RASMI qo'yilganmi.
 *
 * Shisha retsepti ilovaning o'z bezakli foni uchun o'ylangan: past
 * kontrastli va och. Ixtiyoriy fotosurat ustida esa o'sha yarim shaffof
 * sirt rasmni yeb qo'yadi - yorug' mavzuda butun ekran sut rangli
 * pardaga aylanardi. Rasm bor bo'lsa sirtlar deyarli to'ldiriladi va
 * rasm ular ORASIDA o'z holicha ko'rinadi.
 */
export const makeGlass = (
  colors: ColorTokens,
  shadows: ShadowTokens,
  onPhoto = false,
  level: TransparencyLevel = DEFAULT_TRANSPARENCY,
  isDark = false,
): GlassTokens => {
  // TUS mavzudan, ALFA sozlamadan. Shu sababli shaffoflikni o'zgartirish
  // sirtning rangini emas, faqat qalinligini o'zgartiradi.
  const alpha = glassAlpha(level, onPhoto, isDark, canFrost());
  const surfaceColor = reAlpha(
    onPhoto ? colors.glassSurfaceOnPhoto : colors.glassSurface, alpha.surface);
  const strongColor = reAlpha(
    onPhoto ? colors.glassSurfaceStrongOnPhoto : colors.glassSurfaceStrong, alpha.strong);
  const mutedColor = reAlpha(
    onPhoto ? colors.glassMutedOnPhoto : colors.glassMuted, alpha.muted);

  // Muzlatish FAQAT fon rasmi ustida va sirt shaffof bo'lganda. Bezakli
  // fon mayda detalsiz - u yerda blur ko'zga ko'rinmaydi, scroll'dagi
  // narxi esa qolardi (backdrop har kadrda qayta hisoblanadi). To'liq
  // yopiq ("Yo'q") sirt ortini baribir ko'rsatmaydi.
  const frost = onPhoto && alpha.surface < 1 ? photoFrost(FROST_BLUR, isDark) : {};

  return {
  surface: {
    backgroundColor: surfaceColor,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    ...frost,
    ...shadows.card,
  },
  // Bu sirtlar STATIK va sanoqli (modal, summary) — haqiqiy blur shu yerda
  // o'zini oqlaydi.
  raised: {
    backgroundColor: strongColor,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    // Rasm ustida - boshqa sirtlar bilan bir xil muzlatish (yorqinlik
    // tuzatishi bilan): "Ko'p" da bu karta ham to'liq shaffof.
    ...(onPhoto && alpha.strong < 1 ? photoFrost(24, isDark) : backdrop(24)),
    ...shadows.raised,
  },
  // Soyasiz: bu sirt ALLAQACHON shisha karta ichida turadi, ikkinchi soya
  // qatlami esa "ho'l" ko'rinish beradi. Blur ham keraksiz — ota-sirt
  // backdrop'ni allaqachon hisoblab bo'lgan, ichkarida uni takrorlash
  // natijaga hech narsa qo'shmaydi.
  muted: {
    backgroundColor: mutedColor,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  pane: {
    backgroundColor: surfaceColor,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    ...frost,
  },
  flush: {
    backgroundColor: surfaceColor,
    ...frost,
  },
  // Dialog sirti: blur mavjud bo'lmagan platformalarda ham matn o'qilishi
  // SHART, shuning uchun shaffoflik yo'q.
  modal: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    ...shadows.raised,
  },
  // Modal ochilganda ortdagi ekran ko'rinib turadi, lekin o'qilmaydi — diqqat
  // dialogda qoladi, kontekst esa yo'qolmaydi.
  scrim: {
    backgroundColor: colors.overlay,
    ...backdrop(12),
  },
  frost,
  };
};
