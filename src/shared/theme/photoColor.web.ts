import type { Rgb } from './photoTone';

/**
 * O'lchov maydonining tomoni, piksel.
 *
 * O'rtacha rang uchun rasmning o'zi kerak emas: 32x32 ga kichraytirilgan
 * nusxa yetarli va u bir zumda o'qiladi - katta fotosuratni to'liq
 * aylanib chiqish esa sezilarli to'xtalish berardi.
 */
const SIDE = 32;

/** Bir rasm bir marta o'lchanadi: mavzu har o'zgarganda qayta yuklanmaydi. */
const cache = new Map<string, Promise<Rgb | null>>();

const measure = (url: string): Promise<Rgb | null> =>
  new Promise((resolve) => {
    const img = new window.Image();
    // Web'da API shu domenda (Apache proxy), lokal ishlab chiqishda esa
    // backend CORS '*' ga ochiq. Bu bayroqsiz canvas "iflos" bo'lib
    // qolardi va piksellarni o'qib bo'lmasdi.
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SIDE;
        canvas.height = SIDE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, SIDE, SIDE);
        const { data } = ctx.getImageData(0, 0, SIDE, SIDE);

        // Shaffof piksellar (PNG) hisobga kirmaydi: ular ostida rasm
        // emas, ilovaning o'z foni turadi.
        let r = 0;
        let g = 0;
        let b = 0;
        let weight = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3] / 255;
          r += data[i] * a;
          g += data[i + 1] * a;
          b += data[i + 2] * a;
          weight += a;
        }
        resolve(weight > 0 ? { r: r / weight, g: g / weight, b: b / weight } : null);
      } catch {
        // CORS bilan "iflos" canvas - o'lchab bo'lmaydi, mavzu tegilmaydi.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

/**
 * Fon rasmining o'rtacha rangi (sRGB, 0..255) yoki null.
 *
 * null = o'lchab bo'lmadi. Bunday natija keshda QOLMAYDI: tarmoq bir
 * lahzaga uzilgan bo'lsa, keyingi urinish yana o'lchaydi.
 */
export function samplePhotoColor(url: string): Promise<Rgb | null> {
  if (!url || typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  const hit = cache.get(url);
  if (hit) return hit;

  const job = measure(url);
  cache.set(url, job);
  void job.then((color) => {
    if (!color) cache.delete(url);
  });
  return job;
}
