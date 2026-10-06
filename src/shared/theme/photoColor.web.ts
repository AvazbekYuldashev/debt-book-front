import type { BackgroundFit } from './backgroundSettings';
import type { PhotoCell, PhotoSample } from './photoTone';

/**
 * Kataklar to'ri: telefon ekrani nisbatida (1:2).
 *
 * Rasmning o'zi kerak emas - qayerda och, qayerda to'q ekanini bilish
 * yetarli. 12x24 katak bir zumda o'qiladi, katta fotosuratni to'liq
 * aylanib chiqish esa sezilarli to'xtalish berardi.
 */
const COLS = 12;
const ROWS = 24;
/**
 * Har katak shuncha x shuncha piksel o'rtachasi. Brauzer kichraytirishda
 * har nuqtani alohida tanlaydi; bir necha nuqtani qo'lda o'rtachalash
 * mayda detal (yorqin dog') bitta katakni buzib yubormasligini kafolatlaydi.
 */
const SUB = 4;

/** Bir rasm bir marta o'lchanadi: mavzu har o'zgarganda qayta yuklanmaydi. */
const cache = new Map<string, Promise<PhotoSample | null>>();

/**
 * Rasmning EKRANDA KO'RINADIGAN qismi.
 *
 * "To'ldirish" (cover) rejimida rasm markazdan kesiladi: yotiq fotosurat
 * tik ekranda faqat o'rta qismi bilan ko'rinadi. Chetlardagi, ko'rinmaydigan
 * qism o'lchovga kirsa, qaror boshqa rasm uchun chiqarilgan bo'lardi.
 * "Sig'dirish" (contain) da rasm butunlay ko'rinadi.
 */
const visibleRect = (width: number, height: number, fit: BackgroundFit, viewAspect: number) => {
  if (fit !== 'cover' || !(viewAspect > 0)) return { sx: 0, sy: 0, sw: width, sh: height };
  const imageAspect = width / height;
  if (imageAspect > viewAspect) {
    const sw = height * viewAspect;
    return { sx: (width - sw) / 2, sy: 0, sw, sh: height };
  }
  const sh = width / viewAspect;
  return { sx: 0, sy: (height - sh) / 2, sw: width, sh };
};

const measure = (url: string, fit: BackgroundFit, viewAspect: number): Promise<PhotoSample | null> =>
  new Promise((resolve) => {
    const img = new window.Image();
    // Web'da API shu domenda (Apache proxy), lokal ishlab chiqishda esa
    // backend CORS '*' ga ochiq. Bu bayroqsiz canvas "iflos" bo'lib
    // qolardi va piksellarni o'qib bo'lmasdi.
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = COLS * SUB;
        const h = ROWS * SUB;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx || !img.naturalWidth || !img.naturalHeight) {
          resolve(null);
          return;
        }
        const { sx, sy, sw, sh } = visibleRect(img.naturalWidth, img.naturalHeight, fit, viewAspect);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        const cells: PhotoCell[] = [];
        for (let row = 0; row < ROWS; row += 1) {
          for (let col = 0; col < COLS; col += 1) {
            // Shaffof piksellar (PNG) rangga og'irlik bilan kiradi: ular
            // ostida rasm emas, ilovaning o'z foni turadi.
            let r = 0;
            let g = 0;
            let b = 0;
            let weight = 0;
            for (let dy = 0; dy < SUB; dy += 1) {
              for (let dx = 0; dx < SUB; dx += 1) {
                const i = ((row * SUB + dy) * w + (col * SUB + dx)) * 4;
                const a = data[i + 3] / 255;
                r += data[i] * a;
                g += data[i + 1] * a;
                b += data[i + 2] * a;
                weight += a;
              }
            }
            cells.push(
              weight > 0
                ? { r: r / weight, g: g / weight, b: b / weight, a: weight / (SUB * SUB) }
                : { r: 0, g: 0, b: 0, a: 0 },
            );
          }
        }
        resolve({ rows: ROWS, cols: COLS, cells });
      } catch {
        // CORS bilan "iflos" canvas - o'lchab bo'lmaydi, mavzu tegilmaydi.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

/**
 * Fon rasmining ekranda ko'rinadigan qismi, kataklarga bo'lingan, yoki null.
 *
 * null = o'lchab bo'lmadi. Bunday natija keshda QOLMAYDI: tarmoq bir
 * lahzaga uzilgan bo'lsa, keyingi urinish yana o'lchaydi.
 */
export function samplePhoto(
  url: string,
  fit: BackgroundFit,
  viewAspect: number,
): Promise<PhotoSample | null> {
  if (!url || typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  const key = `${url}|${fit}|${viewAspect.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const job = measure(url, fit, viewAspect);
  cache.set(key, job);
  void job.then((sample) => {
    if (!sample) cache.delete(key);
  });
  return job;
}
