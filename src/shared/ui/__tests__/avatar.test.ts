import { getInitials, pickAvatarColor } from '../avatar';

/**
 * Avatar ranglari - Telegram uslubida, yettita TUS.
 *
 * Bir muddat bu yerda bitta rangning yetti darajasi turardi: ro'yxatdagi
 * o'nlab rangli doiracha ekranni "svetafor" qilib yuborgandi. Keyin
 * foydalanuvchi aynan rang-barang variantni so'radi va u qaytarildi -
 * lekin pul ranglaridan uzoqroq palitra bilan.
 */
describe('pickAvatarColor', () => {
  it('bir xil ism doim bir xil rangni oladi', () => {
    expect(pickAvatarColor('Ali')).toEqual(pickAvatarColor('Ali'));
  });

  /** Ro'yxatda odamlar bir-biridan ajralib turishi kerak. */
  it('turli ismlar turli rang oladi', () => {
    const colors = new Set(
      ['Ali', 'Vali', 'Hasan', 'Husan', 'Said', 'Olim', 'Karim']
        .map((name) => pickAvatarColor(name).bg),
    );
    expect(colors.size).toBeGreaterThan(3);
  });

  /** Qorong'i mavzuda boshqa juftlik - oq fonli doiracha ko'zni qamashtirardi. */
  it('mavzuga qarab juftlik almashadi', () => {
    expect(pickAvatarColor('Ali', true)).not.toEqual(pickAvatarColor('Ali', false));
  });

  /**
   * ILOVA RANGIGA ERGASHMAYDI - bu ataylab.
   *
   * Odam ro'yxatda ismni rangi bilan eslab qoladi; mavzu yoki brend
   * rangi almashganda u o'zgarib ketsa, o'sha xotira buzilardi.
   */
  it('rang ismdan hisoblanadi, boshqa hech narsadan emas', () => {
    const first = pickAvatarColor('Ali');
    const second = pickAvatarColor('Ali');
    expect(first.bg).toBe(second.bg);
    expect(first.fg).toBe(second.fg);
  });

  /**
   * Palitrada TOZA qizil va TOZA yashil yo'q: ular qarz va haq ranglari
   * bilan adashardi. Shuning uchun marjon va nefrit ishlatiladi.
   */
  it('pul ranglaridan uzoq: sof qizil va yashil yoq', () => {
    const forbidden = ['#FF0000', '#00FF00', '#F00', '#0F0'];
    for (const name of ['Ali', 'Vali', 'Hasan', 'Husan', 'Said', 'Olim', 'Karim', 'Bek']) {
      for (const dark of [false, true]) {
        const picked = pickAvatarColor(name, dark);
        expect(forbidden).not.toContain(picked.fg.toUpperCase());
        expect(forbidden).not.toContain(picked.bg.toUpperCase());
      }
    }
  });
});

describe('getInitials', () => {
  it('ikki sozdan ikki harf', () => {
    expect(getInitials('Avazbek Yuldashev')).toBe('AY');
  });

  it('bitta sozdan ikki harf', () => {
    expect(getInitials('Ali')).toBe('AL');
  });

  it('bosh ism savol belgisi', () => {
    expect(getInitials('')).toBe('?');
  });
});
