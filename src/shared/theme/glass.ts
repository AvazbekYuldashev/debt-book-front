import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import type { ColorTokens } from './colors';
import type { ShadowTokens } from './elevation';

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
  /** Ko'tarilgan STATIK sirt: modal, summary karta. Bu yerda blur bor. */
  raised: ViewStyle;
  /** Ichki bo'lak: klavisha, chip, ajratilgan maydon. Soyasiz, blursiz. */
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

export const makeGlass = (colors: ColorTokens, shadows: ShadowTokens): GlassTokens => ({
  // Blur ATAYIN yo'q. Bu sirt ro'yxat konteyneri va odatiy karta sifatida
  // ishlatiladi, ya'ni SCROLL paytida siljiydi — har kadrda backdrop qayta
  // hisoblanardi va web'da aynan shu "qotish"ning asosiy sababi bo'lardi.
  // Ambient fon mayda detalsiz bo'lgani uchun shaffoflikning o'zi kerakli
  // "xira shisha" taassurotini beradi.
  surface: {
    backgroundColor: colors.glassSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    ...shadows.card,
  },
  // Bu sirtlar STATIK va sanoqli (modal, summary) — haqiqiy blur shu yerda
  // o'zini oqlaydi.
  raised: {
    backgroundColor: colors.glassSurfaceStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    ...backdrop(24),
    ...shadows.raised,
  },
  // Soyasiz: bu sirt ALLAQACHON shisha karta ichida turadi, ikkinchi soya
  // qatlami esa "ho'l" ko'rinish beradi. Blur ham keraksiz — ota-sirt
  // backdrop'ni allaqachon hisoblab bo'lgan, ichkarida uni takrorlash
  // natijaga hech narsa qo'shmaydi.
  muted: {
    backgroundColor: colors.glassMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  pane: {
    backgroundColor: colors.glassSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  flush: {
    backgroundColor: colors.glassSurface,
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
});
