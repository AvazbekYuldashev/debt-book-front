import type { NotificationDTO } from '../types/notification';

/** Bir martada ko'rsatiladigan popup soni — qolganini badge aytadi. */
export const MAX_POPUPS_PER_BATCH = 3;

export interface PopupSelection {
  /** Qurilma bildirishnomasi chiqariladigan xabarlar (eskidan yangiga). */
  toShow: NotificationDTO[];
  /** Shu seansda qayta chiqmasligi uchun eslab qolinadigan id'lar. */
  toRemember: string[];
}

/**
 * Qaysi bildirishnoma popup bo'lishini hal qiladi. Uchta qoida:
 *
 *  1. O'QILGAN xabar hech qachon chiqmaydi — odam uni allaqachon ko'rgan.
 *  2. Bitta xabar bir SEANSDA bir marta chiqadi (`alreadyNotified`).
 *  3. Seans tugab, ilova qayta ochilsa — hali o'qilmagan xabar yana bir marta
 *     eslatib o'tadi. Chaqiruvchi to'plamni xotirada saqlagani uchun shunday
 *     bo'ladi: uni saqlashga urinmaslik ataylab qilingan qaror.
 *
 * Ish maydoni almashganda to'plam saqlanib qoladi — aks holda maydonga
 * o'tish butun ro'yxatni "yangi" deb ko'rsatib, popup yog'dirardi.
 *
 * Sof funksiya: React'siz sinaladi, chunki bu yerda adashish foydalanuvchiga
 * darhol ko'rinadi — xabar ikki marta chiqadi yoki umuman chiqmaydi.
 */
export function selectNotificationsToPopup(
  items: NotificationDTO[],
  alreadyNotified: ReadonlySet<string>,
): PopupSelection {
  const toRemember: string[] = [];
  const pending: NotificationDTO[] = [];

  for (const item of items) {
    if (alreadyNotified.has(item.id)) continue;
    if (item.read) {
      // O'qilganini ham eslab qolamiz: ro'yxat har yangilanganda uni qayta
      // ko'rib chiqish shart emas.
      toRemember.push(item.id);
      continue;
    }
    toRemember.push(item.id);
    pending.push(item);
  }

  // Ro'yxat DESC (yangi birinchi) keladi. Eng yangilarini olamiz, lekin
  // ko'rsatishni eskidan yangiga qarab qilamiz — oxirgi chiqqani eng yangisi.
  const toShow = pending.slice(0, MAX_POPUPS_PER_BATCH).reverse();

  return { toShow, toRemember };
}
