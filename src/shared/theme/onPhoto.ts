import type { TextStyle } from 'react-native';
import type { ColorTokens } from './colors';

/**
 * Fon RASMI ustida turgan matnni ajratib turuvchi halo.
 *
 * NEGA KERAK: ekranda matnning ko'pi kartalar ustida va ular o'z
 * foniga ega. Lekin bir qismi - guruh va bo'lim sarlavhalari - panel
 * TASHQARISIDA, to'g'ridan-to'g'ri fonda turadi. Foydalanuvchi to'q
 * rasm qo'yganda yorug' mavzudagi to'q matn unga qo'shilib ketardi.
 *
 * YECHIM MAVZU RANGIDA: halo `background` rangidan olinadi, ya'ni
 * yorug' mavzuda matn atrofida oq nur, qorong'ida esa qora. Shu sababli
 * u HAR QANDAY rasmda ishlaydi - rasm to'q bo'lsa yorug' halo ajratadi,
 * yorug' bo'lsa qorong'i mavzudagi qora halo.
 *
 * Yuqoridagi parda bu ishni ekranning faqat yuqori tasmasida bajaradi;
 * pastroqdagi sarlavhalarga aynan shu halo kerak.
 *
 * RASMSIZ O'CHIQ: ilovaning o'z foni past kontrastli va halo u yerda
 * matnni biroz "yumshoq" qilib ko'rsatardi, foydasi esa yo'q.
 */
export const photoTextHalo = (colors: ColorTokens, onPhoto: boolean): TextStyle =>
  onPhoto
    ? {
        textShadowColor: colors.background,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
      }
    : {};
