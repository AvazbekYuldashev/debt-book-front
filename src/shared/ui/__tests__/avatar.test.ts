import { getInitials, pickAvatarColor } from '../avatar';
import { darkColors, lightColors } from '../../theme/colors';
import { applyAccent } from '../../theme/accent';

/**
 * Belgilar BITTA rang oilasida.
 *
 * Ilgari bu yerda yetti xil TUS bor edi - ko'k, yashil, sariq, pushti.
 * Ro'yxatda o'nlab qator bo'lgani uchun ekran svetaforga aylanardi va
 * ular qarz qizili bilan aralashib, ma'noli rangni bezakdan ajratib
 * bo'lmay qolgandi.
 */
describe('pickAvatarColor', () => {
  it('bir xil ism doim bir xil tusni oladi', () => {
    expect(pickAvatarColor('Ali', lightColors)).toEqual(pickAvatarColor('Ali', lightColors));
  });

  /** Farq yo'qolmaydi: qatorlar baribir bir-biridan ajralib turadi. */
  it('turli ismlar turli kuch oladi', () => {
    const tints = new Set(
      ['Ali', 'Vali', 'Hasan', 'Husan', 'Said', 'Olim', 'Karim']
        .map((name) => pickAvatarColor(name, lightColors).bg),
    );
    expect(tints.size).toBeGreaterThan(1);
  });

  /** Matn rangi DOIM brend rangi - oila bitta. */
  it('matn rangi brend rangida', () => {
    for (const name of ['Ali', 'Vali', 'Hasan']) {
      expect(pickAvatarColor(name, lightColors).fg).toBe(lightColors.primary);
    }
  });

  /** Ilova rangi almashsa, belgilar ham ergashadi. */
  it('tanlangan rangga ergashadi', () => {
    const violet = applyAccent(lightColors, 'violet', false);

    expect(pickAvatarColor('Ali', violet).fg).toBe(violet.primary);
    expect(pickAvatarColor('Ali', violet).fg).not.toBe(lightColors.primary);
  });

  it('mavzuga ham ergashadi', () => {
    expect(pickAvatarColor('Ali', darkColors).fg).toBe(darkColors.primary);
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
