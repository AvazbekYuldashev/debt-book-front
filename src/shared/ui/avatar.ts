// ============================================================
//  Avatar (initial doiracha) yordamchilari — ekranlar bo'ylab yagona manba.
//  Ismdan deterministik tus va bosh harflar.
// ============================================================

/**
 * Avatar ranglari — Telegram uslubida, yettita TUS.
 *
 * TARIX: bir muddat bu yerda bitta rangning yetti darajasi turardi.
 * Sabab jiddiy edi - ro'yxatdagi o'nlab rangli doiracha ekranni
 * "svetafor" qilib yuborgan, ustiga ular qarz qizili va haq yashili
 * bilan aralashib ketgandi. Keyin foydalanuvchi aynan rang-barang
 * variantni so'radi, shuning uchun u qaytarildi - lekin boshqacha
 * qilib.
 *
 * SVETAFORGA QAYTMASLIK uchun uch qoida:
 *
 *   1. Fon YUMSHOQ, matn to'q. Doiracha "yonmaydi" - u yorliq emas,
 *      shunchaki odamni ajratib turadigan belgi.
 *   2. Toza qizil va toza yashil YO'Q. Palitrada ularning o'rniga
 *      marjon (qizg'ish-pushti) va nefrit (ko'kish-yashil) turadi:
 *      ular pul ranglari bilan adashmaydi.
 *   3. Rang MA'NO TASHIMAYDI va buni bilish kerak: u faqat ismdan
 *      hisoblanadi. Shuning uchun u hech qachon summaning yoniga
 *      emas, faqat doiracha ichida ishlatiladi.
 *
 * Rang ilova rangiga ERGASHMAYDI (ilgari ergashardi): Telegramda ham
 * avatar rangi mavzudan mustaqil - odam ro'yxatda ismni rangi bilan
 * eslab qoladi, mavzu almashganda u o'zgarib ketsa, o'sha xotira
 * buziladi.
 */
interface AvatarHue {
  light: AvatarColor;
  dark: AvatarColor;
}

export interface AvatarColor {
  bg: string;
  fg: string;
}

const HUES: AvatarHue[] = [
  // Marjon - qizilning o'rniga: qarz qizili bilan adashmaydi.
  { light: { bg: '#FBE4E6', fg: '#C2405A' }, dark: { bg: '#4A2730', fg: '#F2A6B4' } },
  // To'q sariq
  { light: { bg: '#FCEBDA', fg: '#B86A1E' }, dark: { bg: '#4A3520', fg: '#F0BC82' } },
  // Nefrit - yashilning o'rniga: haq yashili bilan adashmaydi.
  { light: { bg: '#DEF0E8', fg: '#2F7D63' }, dark: { bg: '#23403A', fg: '#8FD3BB' } },
  // Moviy
  { light: { bg: '#DCEFF4', fg: '#2B7489' }, dark: { bg: '#1F3B44', fg: '#8ACEDF' } },
  // Ko'k
  { light: { bg: '#E0E8FA', fg: '#3C5FA8' }, dark: { bg: '#25304D', fg: '#A3BBEE' } },
  // Siyoh
  { light: { bg: '#E6E4F7', fg: '#5B4FA6' }, dark: { bg: '#2F2B4D', fg: '#B6AFEC' } },
  // Binafsha
  { light: { bg: '#F2E2F2', fg: '#8E4A91' }, dark: { bg: '#412944', fg: '#DCA8DE' } },
];

export const getInitials = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/** Ismdan barqaror indeks: bir xil ism doim bir xil tusni oladi. */
const hashOf = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < (seed || '').length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash;
};

/**
 * Ismga mos tus.
 *
 * Bir xil ism DOIM bir xil rangni oladi - ro'yxat qayta yuklanganda
 * ham, boshqa qurilmada ham. Rang ismdan hisoblanadi, saqlanmaydi.
 */
export const pickAvatarColor = (seed: string, isDark = false): AvatarColor => {
  const hue = HUES[hashOf(seed) % HUES.length];
  return isDark ? hue.dark : hue.light;
};
