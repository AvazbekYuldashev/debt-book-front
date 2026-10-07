/**
 * Sirtlarning shaffoflik darajasi.
 *
 * NEGA SOZLAMA: to'g'ri qiymat FONGA bog'liq va uni dastur bila olmaydi.
 * Tinch, bir xil rasmda sirt deyarli ko'rinmas bo'lsa chiroyli; shovqinli
 * yoki kontrastli rasmda esa o'sha qiymat matnni o'qib bo'lmas qiladi.
 * Shuning uchun tanlov foydalanuvchida.
 */
export type TransparencyLevel = 'none' | 'solid' | 'medium' | 'clear';

/**
 * Tartib "Xiralik" bilan bir xil - Yo'q -> Kam -> O'rta -> Ko'p: ikki
 * qo'shni sozlama teskari tartibda tursa, odam adashardi.
 *
 * "Yo'q" - shaffoflik umuman yo'q: kartalar fonni to'liq yopadi, rasm
 * faqat ular ORASIDA ko'rinadi.
 */
export const TRANSPARENCY_LEVELS: { id: TransparencyLevel; labelKey: string }[] = [
  { id: 'none', labelKey: 'glass.none' },
  { id: 'solid', labelKey: 'glass.solid' },
  { id: 'medium', labelKey: 'glass.medium' },
  { id: 'clear', labelKey: 'glass.clear' },
];

export const DEFAULT_TRANSPARENCY: TransparencyLevel = 'medium';

interface AlphaSet {
  surface: number;
  strong: number;
  muted: number;
}

/** "Yo'q": shaffoflik yo'q - sirt to'liq yopiq. */
const OPAQUE: AlphaSet = { surface: 1, strong: 1, muted: 1 };

/**
 * Shaffoflik ikki holatda butunlay boshqacha bo'lishi kerak.
 *
 * Ilovaning O'Z bezakli foni past kontrastli va och - u yerda sirt juda
 * shaffof bo'lsa ham matn o'qiladi. Ixtiyoriy FOTOSURAT esa bunday
 * emas: to'q yoki shovqinli rasm ustida o'sha qiymat matnni yeb
 * qo'yadi. Shu sababli har daraja uchun ikki jadval.
 */
const WITHOUT_PHOTO_LIGHT: Record<TransparencyLevel, AlphaSet> = {
  none: OPAQUE,
  // "Ko'p" - to'liq shaffof: karta faqat chegarasi va soyasi bilan ajraladi.
  // Ichki bo'lak (chip, klavisha) ozgina tusda qoladi - aks holda u
  // shaffof karta ichida butunlay yo'qolardi.
  clear: { surface: 0, strong: 0, muted: 0.12 },
  medium: { surface: 0.28, strong: 0.44, muted: 0.2 },
  solid: { surface: 0.55, strong: 0.7, muted: 0.4 },
};

/**
 * Rasmsiz QORONG'I: surface/strong yorug' bilan bir xil, muted ATAYIN
 * qalinroq.
 *
 * Qorong'i muted tusi endi TO'Q chip (colors.ts glassMuted) - kartadan
 * bir pog'ona och. Yorug'dagi kabi 0.12-0.4 da u to'q fon ustida deyarli
 * ko'rinmasdi: ichki bo'lak (klavisha, chip) ota-kartadan ajralmasdi.
 * Ilgari bu yerda och slate turardi va past alfa "ko'tarish" berardi;
 * endi o'sha ko'tarishni to'q rgb yuqori alfada beradi - natija "Ko'p"
 * da avvalgisiga deyarli teng, "Kam" da esa sut rangli emas.
 */
const WITHOUT_PHOTO_DARK: Record<TransparencyLevel, AlphaSet> = {
  none: OPAQUE,
  clear: { surface: 0, strong: 0, muted: 0.55 },
  medium: { surface: 0.28, strong: 0.44, muted: 0.65 },
  solid: { surface: 0.55, strong: 0.7, muted: 0.8 },
};

/**
 * FOTOSURAT ustida: Samsung (One UI) papka va bildirishnomalari kabi
 * MUZLI SHISHA - darajalar orasida ANIQ farq bilan.
 *
 * Shaffoflik faqat elementlarga tegishli: fon rasmi "Xiralik" bo'yicha
 * keskin ham qolishi mumkin, sirt esa ortidagi rasmni o'zi xiralashtiradi
 * (web'da backdrop-filter - glass.ts).
 *
 *   Yo'q  - to'liq yopiq karta;
 *   Kam   - ozgina ko'rinadi (0.8). Ilgari 0.85 edi: to'q rasmda to'q
 *           karta bilan "Yo'q" dan deyarli farq qilmasdi;
 *   O'rta - yarim shaffof shisha (0.5);
 *   Ko'p  - TO'LIQ SHAFFOF (0): tus yo'q, faqat muzlatish. Foydalanuvchi
 *           talabi. Ilgari "Ko'p" 0.78 edi va to'rt daraja deyarli bir xil
 *           to'q karta bo'lib ko'rinardi.
 *
 * O'QILISH: "Yo'q" va "Kam" har qanday rasmda (muzlatishsiz ham) matnni
 * o'qitadi. "O'rta" va "Ko'p" da matn rasmning o'zi ustida turadi -
 * uni ko'rinish (photoTheme: to'q rasmda oq yozuv, och rasmda to'q) va
 * muzlatishning yorqinlik tuzatishi o'qitadi. O'rtacha kulrang rasmda
 * kontrast pastroq - to'liq shaffoflikning tabiiy narxi.
 *
 * Ichki bo'lak (muted: chip, klavisha) "Ko'p" da ham ozgina tusda: aks
 * holda u shaffof karta ichida butunlay yo'qolardi.
 */
const WITH_PHOTO_LIGHT: Record<TransparencyLevel, AlphaSet> = {
  none: OPAQUE,
  solid: { surface: 0.8, strong: 0.86, muted: 0.8 },
  medium: { surface: 0.5, strong: 0.58, muted: 0.5 },
  clear: { surface: 0, strong: 0, muted: 0.22 },
};

/** Qorong'ida - xuddi shu zinapoya, to'q muzli shisha. */
const WITH_PHOTO_DARK: Record<TransparencyLevel, AlphaSet> = {
  none: OPAQUE,
  solid: { surface: 0.8, strong: 0.86, muted: 0.85 },
  medium: { surface: 0.5, strong: 0.58, muted: 0.6 },
  clear: { surface: 0, strong: 0, muted: 0.4 },
};

/**
 * Muzlatish YO'Q joyda (telefon: backdrop-filter yo'q) rasm ustidagi
 * sirtning eng past tusi.
 *
 * Telefonda ikkala himoya ham yo'q: sirt ortini muzlata olmaydi va rasm
 * o'lchanmagani uchun ko'rinish (oq/to'q yozuv) rasmga moslashmaydi.
 * To'liq shaffof karta u yerda keskin rasm ustida matnni yerdi - masalan
 * tungi rejim + och rasm. Shu sababli telefonda "O'rta" va "Ko'p" HAR
 * QANDAY rasmda o'qiladigan eng shaffof qiymatda qoladi (test qulflaydi).
 */
const NO_FROST_FLOOR: Record<'light' | 'dark', Partial<Record<TransparencyLevel, number>>> = {
  // Qoida web'dagi photoFloor bilan bir xil:
  //   "Ko'p"        - asosiy va kulrang matn: eng kami yorug' 0.59,
  //                   qorong'i 0.68 (qora/oq rasm);
  //   "Kam", "O'rta" - + qizil/yashil summalar va HAR ilova rangi (3:1):
  //                   eng kami yorug' 0.79, qorong'i 0.80.
  // Qadamlar kamida 0.08: ilgari qorong'ida Kam 0.8 / O'rta 0.76 edi va
  // telefonda bu ikki daraja bir xil ko'rinardi.
  light: { solid: 0.88, medium: 0.8, clear: 0.62 },
  dark: { solid: 0.9, medium: 0.82, clear: 0.7 },
};

/**
 * O'lchangan fon rasmi uchun eng kam tus (web) - photoTone.photoFloor.
 *
 *   text    - asosiy va kulrang matn; HAR shaffof darajada;
 *   colored - + rangli matn (summalar, ilova rangi); "Kam" va "O'rta" da.
 *
 * "Ko'p" faqat `text` ni oladi: foydalanuvchi eng ko'p shaffoflikni
 * tanlagan va u ko'p rasmlarda baribir 0 - sirt to'liq shaffof qoladi.
 */
export interface PhotoFloors {
  text: number;
  colored: number;
}

/**
 * Rasm ustidagi MUZLATISH retsepti (web, backdrop-filter): blur ->
 * to'yinganlik -> yorqinlik -> OQ XIRALIK.
 *
 * glass.ts uni CSS'ga va sirt rangiga aylantiradi, photoTone esa o'qilish
 * hisobida AYNAN shuni modellaydi - ikkalasi bitta manbadan o'qiydi, aks
 * holda test bir narsani, ekran boshqasini ko'rsatardi.
 *
 * OQ XIRALIK (rgba 255,255,255): muzli shishaning o'zi - Samsung/iOS
 * panellari kabi sirt ortidagi rasm oqish, "sovuq oyna" bo'lib ko'rinadi.
 * Foydalanuvchi talabi. U daraja tusining OSTIDA turadi (withHaze): "Ko'p"
 * da to'liq ko'rinadi, yopiqroq darajalarda tus uni qoplaydi; "Yo'q" da
 * (yopiq karta) yo'q.
 * Faqat muzlatish bor joyda: blur'siz (telefon) oq qatlam keskin rasm
 * ustidagi sut rangli parda bo'lardi.
 *
 * Yorqinlik tuzatishi: to'q ko'rinishda ortdagi rasmni qoraytiradi (oq
 * yozuv uchun - oq xiralik shuni qisman qaytaradi), yorug'ida biroz
 * oqartiradi (to'q yozuv uchun) - Apple'ning "vibrancy" si kabi.
 *
 * Qiymatlar photoTone testi bilan tanlangan: kulrang shkala va zich rang
 * aylanasining HAR rangida, har darajada matn o'qiladi.
 */
export const FROST_SATURATE = 1.2;
export const FROST_BRIGHTNESS: Record<'light' | 'dark', number> = { light: 1.08, dark: 0.64 };
export const FROST_HAZE: Record<'light' | 'dark', number> = { light: 0.25, dark: 0.14 };

/** Noma'lum daraja standartga tushadi - eski ilova yangisini yuborsa ham. */
export const findTransparency = (id: string | null | undefined): TransparencyLevel =>
  TRANSPARENCY_LEVELS.some((item) => item.id === id)
    ? (id as TransparencyLevel)
    : DEFAULT_TRANSPARENCY;

/**
 * @param frosted sirt ortidagi rasmni xiralashtira oladimi (web: ha,
 *   telefon: yo'q). Faqat fon rasmi ustida ahamiyatli.
 */
export const glassAlpha = (
  level: TransparencyLevel,
  onPhoto: boolean,
  isDark = false,
  frosted = true,
  /** O'lchangan rasm uchun chegaralar (web). Yo'q bo'lsa - jadval. */
  floors?: PhotoFloors,
): AlphaSet => {
  if (!onPhoto) return (isDark ? WITHOUT_PHOTO_DARK : WITHOUT_PHOTO_LIGHT)[level];
  const set = (isDark ? WITH_PHOTO_DARK : WITH_PHOTO_LIGHT)[level];
  if (!frosted) {
    const floor = NO_FROST_FLOOR[isDark ? 'dark' : 'light'][level];
    if (floor === undefined) return set;
    return {
      surface: Math.max(set.surface, floor),
      strong: Math.max(set.strong, floor),
      muted: Math.max(set.muted, floor),
    };
  }
  if (!floors || level === 'none') return set;
  const floor = level === 'clear' ? floors.text : Math.max(floors.text, floors.colored);
  // Ichki bo'lak (muted) ota-sirt ichida: ota qalinlashsa, u ham o'qiladi.
  return {
    surface: Math.max(set.surface, floor),
    strong: Math.max(set.strong, floor),
    muted: set.muted,
  };
};

/**
 * Sirt rangi: muzlatilgan fon ustida oq xiralik (`haze`), uning USTIDA
 * daraja tusi (`rgba` ning rgb'si, `alpha` qalinlikda) - ikkalasi BITTA
 * rgba ga yig'iladi.
 *
 * Xiralik muzli shishaning o'zi, tus esa uning ustidagi bo'yoq: tus qancha
 * qalin bo'lsa, xiralik shuncha kam ko'rinadi. "Ko'p" (alpha 0) - sof oq
 * muzli shisha; "Kam" da u deyarli sezilmaydi va karta rangi (shu bilan
 * qizil/yashil summalar kontrasti) avvalgidek qoladi. "Yo'q" da (alpha 1)
 * xiralik yo'q.
 *
 * Ekran ikki qatlamni shunday aralashtiradi:
 *   natija = alpha*tus + (1-alpha)*(haze*oq + (1-haze)*ort)
 * ya'ni bitta qatlam: qalinligi alpha + (1-alpha)*haze, rangi esa tus va
 * oqning shu ulushlardagi o'rtachasi. Bitta rang - bitta View: qo'shimcha
 * qatlam ham, telefon/web farqi ham yo'q.
 *
 * Mos kelmagan satr reAlpha kabi o'z holicha qaytadi.
 */
export const withHaze = (rgba: string, alpha: number, haze: number): string => {
  if (haze <= 0) return reAlpha(rgba, alpha);
  const match = /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)$/.exec(rgba);
  if (!match) return rgba;
  const total = alpha + (1 - alpha) * haze;
  const tintShare = alpha / total;
  const channel = (value: string) => Math.round(255 * (1 - tintShare) + Number(value) * tintShare);
  return `rgba(${channel(match[1])}, ${channel(match[2])}, ${channel(match[3])}, ${+total.toFixed(3)})`;
};

/**
 * `rgba(...)` satrining faqat ALFASINI almashtiradi.
 *
 * Tusni (rgb) mavzu beradi - yorug'da oq, qorong'ida sovuq kulrang-ko'k.
 * Daraja esa faqat shaffoflikni boshqaradi, ya'ni rang o'zgarmaydi.
 *
 * Mos kelmagan satr O'Z HOLICHA qaytadi: token noto'g'ri yozilgan bo'lsa
 * ham sirt chizilishi kerak, buziq rang butun ekranni yo'qotib
 * yubormasligi lozim.
 */
export const reAlpha = (rgba: string, alpha: number): string => {
  const match = /^rgba\(\s*([^,]+,[^,]+,[^,]+),\s*[\d.]+\s*\)$/.exec(rgba);
  return match ? `rgba(${match[1]}, ${alpha})` : rgba;
};
