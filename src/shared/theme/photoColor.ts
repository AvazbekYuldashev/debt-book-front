import type { BackgroundFit } from './backgroundSettings';
import type { PhotoSample } from './photoTone';

// Native'da rasm piksellarini o'qish uchun qo'shimcha native modul kerak
// (canvas yo'q). Shuning uchun bu yerda o'lchov YO'Q: null = "noma'lum",
// mavzu esa foydalanuvchi tanlaganicha qoladi.
// Web varianti (.web.ts) rasmni kichik canvas'da o'lchaydi.
export function samplePhoto(
  _url: string,
  _fit: BackgroundFit,
  _viewAspect: number,
): Promise<PhotoSample | null> {
  return Promise.resolve(null);
}
