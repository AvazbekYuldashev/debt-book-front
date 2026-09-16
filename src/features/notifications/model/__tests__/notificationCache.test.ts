import {
  clearPage,
  insertIntoPage,
  markAllReadInPage,
  markReadInPage,
  removeFromPage,
} from '../notificationCache';
import type { PageResponse } from '../../../../shared/types/money';
import type { NotificationDTO } from '../../types/notification';

const item = (id: string, createdDate: string, read = false): NotificationDTO =>
  ({ id, message: `xabar-${id}`, read, createdDate } as NotificationDTO);

const page = (content: NotificationDTO[], totalElements = content.length): PageResponse<NotificationDTO> =>
  ({ content, totalElements, number: 0, size: 20, totalPages: 1, last: true });

const ids = (p?: PageResponse<NotificationDTO>) => p?.content.map((n) => n.id);

describe('removeFromPage', () => {
  it('elementni olib tashlaydi va sanoqni kamaytiradi', () => {
    const result = removeFromPage(page([item('a', '2026-09-16T10:00:00'), item('b', '2026-09-16T09:00:00')]), 'a');
    expect(ids(result)).toEqual(['b']);
    expect(result?.totalElements).toBe(1);
  });

  it('element yo\'q bo\'lsa sahifa o\'zgarmaydi', () => {
    const original = page([item('a', '2026-09-16T10:00:00')]);
    expect(removeFromPage(original, 'yoq')).toBe(original);
  });

  it('sanoq manfiyga tushmaydi', () => {
    const result = removeFromPage(page([item('a', '2026-09-16T10:00:00')], 0), 'a');
    expect(result?.totalElements).toBe(0);
  });

  it('kesh bo\'sh bo\'lsa (undefined) tegilmaydi', () => {
    expect(removeFromPage(undefined, 'a')).toBeUndefined();
  });
});

describe('insertIntoPage', () => {
  it('sana bo\'yicha to\'g\'ri joyga qo\'yadi (yangi birinchi)', () => {
    const existing = page([item('eski', '2026-09-14T10:00:00'), item('juda-eski', '2026-09-13T10:00:00')]);
    const result = insertIntoPage(existing, item('yangi', '2026-09-16T10:00:00', true));

    expect(ids(result)).toEqual(['yangi', 'eski', 'juda-eski']);
    expect(result?.totalElements).toBe(3);
  });

  it('o\'rtaga ham to\'g\'ri tushadi', () => {
    const existing = page([item('a', '2026-09-16T10:00:00'), item('c', '2026-09-14T10:00:00')]);
    const result = insertIntoPage(existing, item('b', '2026-09-15T10:00:00', true));
    expect(ids(result)).toEqual(['a', 'b', 'c']);
  });

  it('allaqachon bor bo\'lsa ikki nusxa chiqmaydi', () => {
    const existing = page([item('a', '2026-09-16T10:00:00')]);
    const result = insertIntoPage(existing, item('a', '2026-09-16T10:00:00', true));
    expect(ids(result)).toEqual(['a']);
    expect(result?.totalElements).toBe(1);
  });

  it('kesh bo\'sh bo\'lsa tegilmaydi — tab ochilganda o\'zi yuklanadi', () => {
    expect(insertIntoPage(undefined, item('a', '2026-09-16T10:00:00'))).toBeUndefined();
  });
});

describe('markReadInPage / markAllReadInPage / clearPage', () => {
  it('bitta elementni o\'qilgan qiladi', () => {
    const result = markReadInPage(page([item('a', '2026-09-16T10:00:00'), item('b', '2026-09-16T09:00:00')]), 'a');
    expect(result?.content.find((n) => n.id === 'a')?.read).toBe(true);
    expect(result?.content.find((n) => n.id === 'b')?.read).toBe(false);
  });

  it('hammasini o\'qilgan qiladi', () => {
    const result = markAllReadInPage(page([item('a', '2026-09-16T10:00:00'), item('b', '2026-09-16T09:00:00')]));
    expect(result?.content.every((n) => n.read)).toBe(true);
  });

  it('sahifani bo\'shatadi', () => {
    const result = clearPage(page([item('a', '2026-09-16T10:00:00')]));
    expect(result?.content).toEqual([]);
    expect(result?.totalElements).toBe(0);
  });
});

describe('o\'qilmagandan o\'qilganga ko\'chirish (to\'liq stsenariy)', () => {
  it('o\'qilmaganlardan chiqib, o\'qilganlarga qo\'shiladi', () => {
    const target = item('x', '2026-09-16T12:00:00');
    let unread = page([target, item('y', '2026-09-16T11:00:00')]);
    let read = page([item('eski', '2026-09-15T10:00:00', true)]);

    unread = removeFromPage(unread, 'x')!;
    read = insertIntoPage(read, { ...target, read: true })!;

    expect(ids(unread)).toEqual(['y']);
    expect(unread.totalElements).toBe(1);
    // Yangi o'qilgani tepada — sanasi eskiroqidan yangi.
    expect(ids(read)).toEqual(['x', 'eski']);
    expect(read.content[0].read).toBe(true);
    expect(read.totalElements).toBe(2);
  });
});
