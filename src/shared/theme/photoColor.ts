import type { Rgb } from './photoTone';

// Native'da rasm piksellarini o'qish uchun qo'shimcha native modul kerak
// (canvas yo'q). Shuning uchun bu yerda o'lchov YO'Q: null = "noma'lum",
// mavzu esa foydalanuvchi tanlaganicha qoladi.
// Web varianti (.web.ts) rasmni kichik canvas'da o'lchaydi.
export function samplePhotoColor(_url: string): Promise<Rgb | null> {
  return Promise.resolve(null);
}
