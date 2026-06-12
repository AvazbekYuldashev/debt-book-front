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

// Local web dev (expo start --web, localhost:19006) -> backendga to'g'ridan-to'g'ri ulanadi.
// Backend CORS '*' ga ochiq (allowCredentials=false), shuning uchun cross-origin ishlaydi.
const isLocalWebDev =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const LOCAL_WEB_BACKEND = 'http://localhost:8080'; // local backend porti
const WEB_BACKEND = ''; // production: nisbiy — Apache/nginx proxy orqali
const MOBILE_BACKEND = 'http://138.249.7.224'; // TODO: production uchun 'https://domeningiz.uz'

export const BACKEND_URL =
  Platform.OS === 'web'
    ? isLocalWebDev
      ? LOCAL_WEB_BACKEND
      : WEB_BACKEND
    : MOBILE_BACKEND;
