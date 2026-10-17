/*
 * Node globallari SHU YERDA e'lon qilinadi.
 *
 * Loyiha tsconfig'ida `@types/node` yo'q (ilova brauzer va telefonda
 * ishlaydi), faqat shu tekshiruv uchun butun paketni qo'shish ortiqcha
 * bo'lardi.
 */
declare const __dirname: string;
declare const require: (id: string) => { readFileSync(file: string, encoding: string): string };

const fs = require('fs');

/**
 * IJARA KESHI ISH MAYDONIGA bog'langan bo'lishi shart.
 *
 * So'rov `X-Business-ID` sarlavhasi bilan ketadi, kesh kaliti esa
 * sarlavhani bilmaydi. Kalitga ish maydoni qo'shilmasa, hisob
 * almashtirilganda ekranda OLDINGI biznesning ijaralari qolib ketadi —
 * aynan shu xato ro'y bergan edi.
 *
 * Bu tekshiruv qoidani fayl darajasida qulflaydi: yangi so'rov
 * qo'shilganda uni ish maydonisiz yozib yuborish oson, va xato faqat
 * ikkita hisobi bor odamda ko'rinadi.
 */
const HOOKS = `${__dirname}/../useRentals.ts`;

describe('ijara keshining qamrovi', () => {
  const source = fs.readFileSync(HOOKS, 'utf8');

  it("so'rov kalitlari ISH MAYDONI bilan boshlanadi", () => {
    const scoped = source.match(/queryKey: \[\.\.\.rentalKey/g) ?? [];
    expect(scoped.length).toBeGreaterThan(0);

    /*
     * Ish maydonisiz kalit qolmasligi kerak — TOZALASHDAN tashqari.
     *
     * `invalidateQueries({ queryKey: [RENTAL_KEY] })` ataylab keng:
     * o'zgarish bitta ish maydonida bo'lsa ham, boshqasining keshi
     * eskirgan bo'lishi mumkin (bir buyum ikki joyda ko'rinadi).
     * Keragidan ko'p tozalash xavfsiz, kam tozalash esa yo'q.
     */
    const withoutInvalidate = source.replace(/invalidateQueries\([^)]*\)/g, '');
    const bare = withoutInvalidate.match(/queryKey: \[RENTAL_KEY/g) ?? [];
    expect(bare).toEqual([]);
  });

  it('kalit hisob kalitidan quriladi', () => {
    // `accountKey` — "BUSINESS:<id>" yoki "PERSONAL:<id>": ikki hisob
    // hech qachon bitta kesh yozuvini baham ko'rmaydi.
    expect(source).toContain('const { accountKey } = useAccountContext();');
    expect(source).toContain('return [RENTAL_KEY, accountKey];');
  });

  it("har so'rov kalitni o'zi oladi", () => {
    const declarations = source.match(/const rentalKey = useRentalKey\(\);/g) ?? [];
    const usages = source.match(/queryKey: \[\.\.\.rentalKey/g) ?? [];

    // Har ishlatilishga bitta e'lon: biri unutilsa tur xatosi chiqadi,
    // lekin bu yerda son ham tekshiriladi — izoh aniq bo'lsin.
    expect(declarations.length).toBe(usages.length);
  });
});
