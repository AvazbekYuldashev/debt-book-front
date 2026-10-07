import { openTarget } from '../openTarget';

/**
 * Tarixdagi strelka ovoz YARATGAN amalni ochadi - bildirishnoma
 * bosilgandagi kabi. Qayerga borish qarori sof funksiyada, shuning
 * uchun navigatsiyasiz sinaladi.
 */
describe('openTarget', () => {
  /** Tranzaksiyaning O'Z ekrani yo'q: u kontakt tarixining bir qatori. */
  it('tranzaksiya kontaktni ochadi', () => {
    expect(openTarget({ type: 'TRANSACTION', id: 'c1', label: 'Avazbek' })).toEqual({
      kind: 'CONTACT',
      id: 'c1',
    });
  });

  it('xarajat kategoriyani nomi bilan ochadi', () => {
    expect(openTarget({ type: 'EXPENSE', id: 'cat1', label: 'Oziq-ovqat' })).toEqual({
      kind: 'EXPENSE_CATEGORY',
      id: 'cat1',
      name: 'Oziq-ovqat',
    });
  });

  /** Nomi yo'q bo'lsa ham ochiladi - sarlavha bo'sh qoladi, xolos. */
  it('nomsiz kategoriya ham ochiladi', () => {
    expect(openTarget({ type: 'EXPENSE', id: 'cat1', label: null })).toEqual({
      kind: 'EXPENSE_CATEGORY',
      id: 'cat1',
      name: '',
    });
  });

  /**
   * Gap kassasining tafsilot ekrani oltita parametr talab qiladi; ularni
   * havolada saqlash havolani eskiradigan nusxaga aylantirardi, shuning
   * uchun bo'limning o'zi ochiladi.
   */
  it('gap bolimni ochadi', () => {
    expect(openTarget({ type: 'GAP', id: 'g1', label: 'Sinfdoshlar' })).toEqual({
      kind: 'GAP_LIST',
    });
  });

  /** Eski yozuvlarda havola yo'q - strelka umuman ko'rsatilmaydi. */
  it('havola yoq bolsa null', () => {
    expect(openTarget(null)).toBeNull();
  });

  /** Belgisi bo'sh havola ishlamaydi - bosilsa hech narsa bo'lmasdi. */
  it('bosh belgi null', () => {
    expect(openTarget({ type: 'TRANSACTION', id: '', label: null })).toBeNull();
  });
});
