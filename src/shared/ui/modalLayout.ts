import type { ViewStyle } from 'react-native';

/**
 * Modal oynaning eng katta eni.
 *
 * React Native `Modal` web'da hujjat ILDIZIDA ochiladi — ya'ni ilovani
 * markazga yig'adigan AppFrame ustunidan tashqarida. Cheklovsiz u butun
 * brauzer eniga yoyilib ketardi: orqa fonda 560px lik ilova, ustida
 * 1200px lik dialog.
 *
 * Ilova ustunidan (560px) sal torroq: dialog uning ichida turgandek
 * ko'rinsin. Telefonda ta'sir qilmaydi — u yerda ekran baribir tor.
 */
export const MODAL_MAX_WIDTH = 480;

/** Har bir modal kartasiga qo'yiladigan o'lcham cheklovi. */
export const modalCardLayout: ViewStyle = {
  width: '100%',
  maxWidth: MODAL_MAX_WIDTH,
  alignSelf: 'center',
};
