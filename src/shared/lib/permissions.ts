import { BusinessRole } from '../../features/business/types/business';

// ============================================================
//  Frontend ruxsat tekshiruvi — backenddagi BusinessInterceptor
//  siyosati bilan AYNAN bir xil. Bu faqat UI qulayligi uchun
//  (tugmalarni yashirish); haqiqiy himoya backendda.
//
//  role === null  -> shaxsiy workspace (o'z hisobi) -> to'liq ruxsat
//  OWNER          -> to'liq ruxsat
//  ADMIN          -> yozish mumkin, lekin DELETE / kategoriya / biznes
//                    tahriri taqiqlangan (faqat OWNER)
//  MEMBER (USER)  -> faqat o'qish (GET)
// ============================================================

type Role = BusinessRole | null;

/** Yozish (POST/PUT) amallari: MEMBER taqiqlangan. */
export const canWrite = (role: Role): boolean => role !== 'MEMBER';

/** O'chirish (DELETE): faqat OWNER yoki shaxsiy hisob. */
export const canDelete = (role: Role): boolean => role === null || role === 'OWNER';

/** Kategoriya boshqaruvi: faqat OWNER yoki shaxsiy hisob. */
export const canManageCategories = (role: Role): boolean => role === null || role === 'OWNER';

/** Biznesni tahrirlash/o'chirish: faqat OWNER. */
export const canEditBusiness = (role: Role): boolean => role === 'OWNER';

/** A'zo qo'shish: OWNER va ADMIN (shaxsiy hisobda mavjud emas). */
export const canManageMembers = (role: Role): boolean => role === 'OWNER' || role === 'ADMIN';

/** A'zolarni o'chirish / rolini o'zgartirish: faqat OWNER. */
export const isBusinessOwner = (role: Role): boolean => role === 'OWNER';

/** Faqat o'qish rejimimi (MEMBER). */
export const isReadOnly = (role: Role): boolean => role === 'MEMBER';
