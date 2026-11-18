import type { RentalResponseDTO } from '../../rentals/types/rental';
import type { NotificationDTO } from '../types/notification';

/**
 * Ijara xabari bosilganda QAYERGA borish.
 *
 * `rentalDetail` — ijara ro'yxati, kartasi ochiq holda.
 * `contact`      — o'sha do'konning kontakt kartasi (ijara bo'limi shunda).
 * `none`         — borish joyi yo'q, ekran joyida qoladi.
 */
export type RentalTarget =
  | { to: 'rentalDetail'; rentalId: string }
  | { to: 'contact'; contactId: string; rentalId: string }
  | { to: 'none' };

/** Xabar ijaraga tegishlimi — yozuvni so'rash kerakmi. */
export const isRentalNotification = (notification: NotificationDTO): boolean =>
  Boolean(notification.rentalId) || Boolean(notification.kind?.startsWith('RENTAL'));

/**
 * Yozuv olingach — manzil.
 *
 * TOMONGA qarab farq qiladi, chunki ijara ro'yxati faqat egasining ish
 * maydonida bor: mijozni u yerga yuborish bo'sh ekranga olib borardi.
 * Kim ega ekanini SERVER aytadi (`owner`) — ilova taxmin qilmaydi.
 *
 * Yozuv olinmasa (o'chirilgan yoki ruxsat yo'q) hech qayerga
 * bormaymiz: xabar o'qilgan bo'lib qoladi, ekran ochiq turadi.
 */
export const rentalTarget = (rental: RentalResponseDTO | null | undefined): RentalTarget => {
  if (!rental) return { to: 'none' };
  if (rental.owner) return { to: 'rentalDetail', rentalId: rental.id };
  // Kontakt kartasiga borganda ham YOZUVNING o'zi ochiladi: kontaktni
  // ko'rsatishning o'zi yetarli emas edi — odam xabarda ko'rgan ijarasini
  // bo'limdan yana qidirishga majbur bo'lardi.
  return rental.clientId
    ? { to: 'contact', contactId: rental.clientId, rentalId: rental.id }
    : { to: 'none' };
};
