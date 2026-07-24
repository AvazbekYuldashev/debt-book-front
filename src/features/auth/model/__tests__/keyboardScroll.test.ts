import { FOCUS_GAP, focusScrollTarget, keyboardOverlap } from '../keyboardScroll';

describe('keyboardOverlap', () => {
  it('klaviatura yopgan balandlikni qaytaradi', () => {
    // 812px ekran, klaviatura tepasi 500px'da → 312px yopilgan.
    expect(keyboardOverlap(812, 500)).toBe(312);
  });

  it('klaviatura yopiq bo\'lsa 0 qaytaradi', () => {
    expect(keyboardOverlap(812, 812)).toBe(0);
  });

  it('oyna klaviaturaga qarab kichraygan bo\'lsa (adjustResize) 0 qaytaradi', () => {
    // Oyna allaqachon kichraygan: pastki chekka klaviatura tepasidan yuqorida.
    expect(keyboardOverlap(500, 560)).toBe(0);
  });
});

describe('focusScrollTarget', () => {
  const visibleHeight = 812 - 312; // klaviatura ochiq: 500px ko'rinadi

  it('klaviatura tagida qolgan maydonni surish ofsetini hisoblaydi', () => {
    // Maydon 700..750 oralig'ida — 500px zonadan ancha past.
    expect(focusScrollTarget({ offset: 0, top: 700, height: 50, visibleHeight }))
      .toBe(700 + 50 + FOCUS_GAP - 500);
  });

  it('joriy skroll ofsetini hisobga oladi', () => {
    expect(focusScrollTarget({ offset: 120, top: 700, height: 50, visibleHeight }))
      .toBe(120 + 700 + 50 + FOCUS_GAP - 500);
  });

  it('ko\'rinib turgan maydonni surmaydi', () => {
    expect(focusScrollTarget({ offset: 0, top: 200, height: 50, visibleHeight })).toBeNull();
  });

  it('oyna tepasidan chiqib ketgan maydonni yuqoriga suradi', () => {
    expect(focusScrollTarget({ offset: 300, top: -40, height: 50, visibleHeight }))
      .toBe(300 - 40 - FOCUS_GAP);
  });

  it('manfiy ofsetga surmaydi', () => {
    expect(focusScrollTarget({ offset: 10, top: -40, height: 50, visibleHeight })).toBe(0);
  });

  it('o\'lchov hali kelmagan bo\'lsa (visibleHeight 0) hech narsa qilmaydi', () => {
    expect(focusScrollTarget({ offset: 0, top: 700, height: 50, visibleHeight: 0 })).toBeNull();
  });
});
