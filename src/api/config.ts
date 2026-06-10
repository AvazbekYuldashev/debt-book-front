import { Platform } from 'react-native';

// ============================================================
//  BACKEND MANZILI
// ============================================================
//  WEB  : '' (bo'sh) -> '/api/v1' nisbiy. Apache/nginx /api ni backendga proxy qiladi.
//  MOBIL (Android/iOS): to'liq absolyut URL kerak (nisbiy ishlamaydi).
//
//  ⚠️ Play Store/Android: HTTPS majburiy. Android cleartext http ni bloklaydi.
//     Production'da bu yerga domeningizni qo'ying: 'https://api.domeningiz.uz'
//     (Hozircha test uchun server IP qo'yilgan.)
// ============================================================

const WEB_BACKEND = ''; // nisbiy — Apache/nginx proxy orqali
const MOBILE_BACKEND = 'http://138.249.7.224'; // TODO: production uchun 'https://domeningiz.uz'

export const BACKEND_URL = Platform.OS === 'web' ? WEB_BACKEND : MOBILE_BACKEND;
