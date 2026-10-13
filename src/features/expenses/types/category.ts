/**
 * Kategoriya nimaga tegishli: xarajat, narxnoma yoki ijara ombori.
 *
 * Bitta backend moduli uchalasiga xizmat qiladi, ro'yxatlar esa HAR DOIM
 * turi bo'yicha filtrlanadi — foydalanuvchi xarajat kategoriyasini
 * narxnomada ko'rmaydi.
 */
export type CategoryType = 'EXPENSE' | 'PRODUCT' | 'RENTAL';

export interface CategoryResponseDTO {
  id: string;
  name: string;
  pin?: boolean;
  photoId?: string;
  visible?: boolean;
  createdDate?: string;
  creatorId?: string;
  /** Eski yozuvlarda bo'lmasligi mumkin — o'sha holatda xarajat. */
  type?: CategoryType;
}

export interface CategoryCreatedDTO {
  name: string;
  type?: CategoryType;
}

export interface CategoryUpdateDTO {
  id: string;
  name: string;
}

export interface CategoryPinDTO {
  id: string;
  pin: boolean;
}
