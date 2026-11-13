import { rentalRowsFor } from '../rentalRows';

/**
 * Ijara qatori FAQAT o'z yo'nalishida chiqadi.
 *
 * Odamning so'zi bilan: "mijozda ijaraga olish faqat Oldim tugmasida
 * chiqsin, Berdimda chiqmasin; biznes profilda esa aksincha".
 */
describe('pul oynasidagi ijara qatorlari', () => {
  const client = { business: false, canRentIn: true };
  const shop = { business: true, canRentIn: true };

  it("mijozda 'Oldim' oynasida OLISH chiqadi", () => {
    expect(rentalRowsFor({ ...client, actionType: 'TAKE' })).toEqual({
      rentIn: true,
      rentOut: false,
    });
  });

  it("mijozda 'Berdim' oynasida hech narsa chiqmaydi", () => {
    // Ombori yo'q odam ijaraga bera olmaydi, olish esa teskari tomon.
    expect(rentalRowsFor({ ...client, actionType: 'GIVE' })).toEqual({
      rentIn: false,
      rentOut: false,
    });
  });

  it("biznesda 'Berdim' oynasida BERISH chiqadi", () => {
    expect(rentalRowsFor({ ...shop, actionType: 'GIVE' })).toEqual({
      rentIn: false,
      rentOut: true,
    });
  });

  /*
   * Biznes ham BOSHQA do'kondan ijaraga oladi.
   *
   * Yo'l bir marta qo'shilgan edi ("biznes hisobida ham Ijaraga olish
   * chiqadi"), keyin yo'nalish qulflanganda `!business` sharti bilan
   * yana yopilib qolgan: biznes egasi o'zi olgan lesani daftariga yoza
   * olmasdi. Hisob turi OLISHGA to'siq emas — to'siq faqat o'z
   * omboridan "olish" bo'lardi, uni `canRentIn` ajratadi.
   */
  it("biznesda 'Oldim' oynasida ham OLISH chiqadi", () => {
    expect(rentalRowsFor({ ...shop, actionType: 'TAKE' })).toEqual({
      rentIn: true,
      rentOut: false,
    });
  });

  it("o'z do'koni bo'lsa 'Oldim' oynasi bo'sh qoladi", () => {
    // `canRentIn` yolg'on: ombor meniki, undan "olish" oddiy berish.
    expect(rentalRowsFor({ business: true, canRentIn: false, actionType: 'TAKE' })).toEqual({
      rentIn: false,
      rentOut: false,
    });
  });

  it("qarshi tomonda ombor bo'lmasa olish yo'li ham yo'q", () => {
    // O'Z omboridan "olish" ma'nosiz: u oddiy berish.
    expect(rentalRowsFor({ business: false, canRentIn: false, actionType: 'TAKE' }).rentIn).toBe(
      false,
    );
  });
});
