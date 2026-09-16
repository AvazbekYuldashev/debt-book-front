import { MAX_POPUPS_PER_BATCH, selectNotificationsToPopup } from '../popupSelection';
import type { NotificationDTO } from '../../types/notification';

const item = (id: string, read: boolean): NotificationDTO =>
  ({ id, message: `xabar-${id}`, read } as NotificationDTO);

const ids = (list: NotificationDTO[]) => list.map((n) => n.id);

describe('selectNotificationsToPopup', () => {
  it("o'qilgan xabar popup chiqarmaydi", () => {
    const { toShow } = selectNotificationsToPopup([item('a', true), item('b', true)], new Set());
    expect(toShow).toEqual([]);
  });

  it("o'qilmagan xabar bir marta chiqadi", () => {
    const items = [item('a', false)];
    const { toShow, toRemember } = selectNotificationsToPopup(items, new Set());
    expect(ids(toShow)).toEqual(['a']);

    // Ikkinchi marta — endi eslab qolingan, qayta chiqmaydi.
    const again = selectNotificationsToPopup(items, new Set(toRemember));
    expect(again.toShow).toEqual([]);
  });

  it("o'qilgandan keyin ham qayta chiqmaydi", () => {
    const first = selectNotificationsToPopup([item('a', false)], new Set());
    expect(ids(first.toShow)).toEqual(['a']);

    // Odam o'qidi -> ro'yxat read=true bilan qaytadi.
    const afterRead = selectNotificationsToPopup([item('a', true)], new Set(first.toRemember));
    expect(afterRead.toShow).toEqual([]);
  });

  it("yangi seansda o'qilmagan xabar yana eslatadi", () => {
    // Seans = to'plam bo'sh. Ilova qayta ochilganda shunday bo'ladi.
    const { toShow } = selectNotificationsToPopup([item('a', false)], new Set());
    expect(ids(toShow)).toEqual(['a']);
  });

  it("o'qilgan xabar yangi seansda ham chiqmaydi", () => {
    const { toShow } = selectNotificationsToPopup([item('a', true)], new Set());
    expect(toShow).toEqual([]);
  });

  it("ko'p o'qilmagan bo'lsa popup soni cheklanadi", () => {
    const many = Array.from({ length: 10 }, (_, i) => item(`n${i}`, false));
    const { toShow, toRemember } = selectNotificationsToPopup(many, new Set());

    expect(toShow).toHaveLength(MAX_POPUPS_PER_BATCH);
    // Ko'rsatilmaganlar ham eslab qolinadi — keyingi yangilanishda "yangi"
    // bo'lib qayta yog'ilmasligi uchun.
    expect(toRemember).toHaveLength(10);
  });

  it('eng yangilari olinadi, ko\'rsatish eskidan yangiga', () => {
    // Ro'yxat DESC keladi: n0 eng yangi.
    const many = [item('n0', false), item('n1', false), item('n2', false), item('n3', false)];
    const { toShow } = selectNotificationsToPopup(many, new Set());

    // n0..n2 tanlanadi, lekin oxirgi chiqqani n0 (eng yangisi) bo'lishi kerak.
    expect(ids(toShow)).toEqual(['n2', 'n1', 'n0']);
  });

  it('aralash roʻyxatda faqat oʻqilmaganlari chiqadi', () => {
    const mixed = [item('a', true), item('b', false), item('c', true), item('d', false)];
    const { toShow, toRemember } = selectNotificationsToPopup(mixed, new Set());

    expect(ids(toShow).sort()).toEqual(['b', 'd']);
    expect(toRemember.sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
