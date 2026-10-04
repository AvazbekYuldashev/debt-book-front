import type { TextStyle } from 'react-native';

/**
 * Sarlavha matnini fondan ajratib turuvchi KONTUR.
 *
 * Rang matnga QARAMA-QARSHI: yorug' mavzuda matn to'q, kontur oq;
 * qorong'ida aksincha. Shu sababli sarlavha har qanday fonda - bezakli
 * naqsh bo'ladimi, ixtiyoriy fotosuratmi - chetlari bilan ajralib
 * turadi.
 *
 * NEGA TOR: ilgari shu joyda radiusi 6 bo'lgan "halo" bor edi va u nur
 * emas, DOG' bo'lib ko'rinardi - matn atrofida xira quyuq hoshiya
 * qolardi. Kontur esa harf qirrasiga yopishadi: uni alohida qatlam deb
 * emas, harfning o'z cheti deb o'qiydi.
 *
 * React Native bitta matnga faqat BITTA soya beradi, ya'ni haqiqiy
 * "stroke" yo'q. Nol siljish va kichik radius amalda o'shanga eng yaqin
 * natijani beradi va ikkala platformada ham bir xil ishlaydi.
 */
export const titleOutline = (isDark: boolean): TextStyle => ({
  textShadowColor: isDark ? '#000000' : '#FFFFFF',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 1.5,
});
