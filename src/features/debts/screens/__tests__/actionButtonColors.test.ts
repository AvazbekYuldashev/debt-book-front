import { lightColors } from '../../../../shared/theme/colors';
import { ACCENTS, applyAccent } from '../../../../shared/theme/accent';

/**
 * "Oldim" va "Berdim" tugmalari MA'NO rangida.
 *
 * Ular qarz va haqni bildiradi, ya'ni ro'yxatdagi qizil/yashil summalar
 * bilan bir tilda bo'lishi kerak. Ilgari "Berdim" brend rangidan olardi
 * va ilova rangi binafsha qilinganda tugma ham binafsha bo'lib, haq
 * bilan bog'liqligi yo'qolardi.
 *
 * Bu test ranglar MANBAYINI qulflaydi: tanlangan rang qanday bo'lsa
 * ham, positive/negative o'zgarmasligi shart.
 */
describe('oldi-berdi tugmalarining ranglari', () => {
  it('har tanlovda ham ozgarmaydi', () => {
    for (const accent of ACCENTS) {
      const next = applyAccent(lightColors, accent.id, false);

      expect(next.positive).toBe(lightColors.positive);
      expect(next.negative).toBe(lightColors.negative);
    }
  });

  /** Brend rangi esa almashadi - tugmalar unga ERGASHMASLIGI kerak. */
  it('brend rangi almashsa ham farq saqlanadi', () => {
    const violet = applyAccent(lightColors, 'violet', false);

    expect(violet.primary).not.toBe(lightColors.primary);
    expect(violet.positive).not.toBe(violet.primary);
  });
});
