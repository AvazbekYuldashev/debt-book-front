import {
  backgroundKey,
  fromRemote,
  clampDim,
  DEFAULT_BACKGROUND,
  hasBackgroundImage,
  MAX_DIM,
  MIN_DIM,
  parseBackground,
  serializeBackground,
} from '../backgroundSettings';

describe('parseBackground', () => {
  it("to'g'ri yozuvni o'qiydi", () => {
    const result = parseBackground(JSON.stringify({ imageId: 'abc', fit: 'contain', dim: 0.4 }));
    expect(result).toEqual({ imageId: 'abc', fit: 'contain', dim: 0.4 });
  });

  it("bo'sh qiymatda standartga qaytadi", () => {
    expect(parseBackground(null)).toEqual(DEFAULT_BACKGROUND);
    expect(parseBackground('')).toEqual(DEFAULT_BACKGROUND);
    expect(parseBackground(undefined)).toEqual(DEFAULT_BACKGROUND);
  });

  it("buzuq JSON ilovani yiqitmaydi", () => {
    expect(parseBackground('{yaroqsiz')).toEqual(DEFAULT_BACKGROUND);
    expect(parseBackground('[1,2,3]')).toEqual(DEFAULT_BACKGROUND);
    expect(parseBackground('"satr"')).toEqual(DEFAULT_BACKGROUND);
  });

  it("noma'lum fit qiymati standartga almashtiriladi", () => {
    const result = parseBackground(JSON.stringify({ imageId: 'a', fit: 'stretch' }));
    expect(result.fit).toBe(DEFAULT_BACKGROUND.fit);
  });

  it("id atrofidagi bo'shliq olib tashlanadi", () => {
    expect(parseBackground(JSON.stringify({ imageId: '  abc  ' })).imageId).toBe('abc');
  });

  it("id bo'lmasa bo'sh satr bo'ladi", () => {
    expect(parseBackground(JSON.stringify({ fit: 'cover' })).imageId).toBe('');
    expect(parseBackground(JSON.stringify({ imageId: 42 })).imageId).toBe('');
  });
});

describe('clampDim', () => {
  it('oraliqdan chiqqan qiymatni qaytaradi', () => {
    expect(clampDim(0)).toBe(MIN_DIM);
    expect(clampDim(-5)).toBe(MIN_DIM);
    expect(clampDim(1)).toBe(MAX_DIM);
    expect(clampDim(99)).toBe(MAX_DIM);
  });

  it('oraliq ichidagi qiymatga tegmaydi', () => {
    expect(clampDim(0.5)).toBe(0.5);
  });

  it('son bo\'lmagan qiymat standartga tushadi', () => {
    expect(clampDim('salom')).toBe(DEFAULT_BACKGROUND.dim);
    expect(clampDim(NaN)).toBe(DEFAULT_BACKGROUND.dim);
    expect(clampDim(undefined)).toBe(DEFAULT_BACKGROUND.dim);
  });

  it("matn ko'rinishidagi son qabul qilinadi", () => {
    expect(clampDim('0.5')).toBe(0.5);
  });

  /**
   * Qiymat YO'QLIGI nol emas: server fon tanlanmagan profil uchun null
   * qaytaradi va u eng past chegaraga tushsa, rasm deyarli pardasiz
   * chiqib, matn o'qilmay qolardi.
   */
  it('qiymat yoqligi standartga tushadi', () => {
    expect(clampDim(null)).toBe(DEFAULT_BACKGROUND.dim);
    expect(clampDim(undefined)).toBe(DEFAULT_BACKGROUND.dim);
    expect(clampDim('')).toBe(DEFAULT_BACKGROUND.dim);
  });
});

describe('serializeBackground', () => {
  it('saqlab-o\'qiganda qiymat o\'zgarmaydi', () => {
    const settings = { imageId: 'xyz', fit: 'contain' as const, dim: 0.42 };
    expect(parseBackground(serializeBackground(settings))).toEqual(settings);
  });

  it("saqlashda ham xiralik oraliqqa keltiriladi", () => {
    const stored = serializeBackground({ imageId: 'a', fit: 'cover', dim: 5 });
    expect(JSON.parse(stored).dim).toBe(MAX_DIM);
  });
});

describe('hasBackgroundImage', () => {
  it("id bo'lsa rost, bo'lmasa yolg'on", () => {
    expect(hasBackgroundImage({ ...DEFAULT_BACKGROUND, imageId: 'a' })).toBe(true);
    expect(hasBackgroundImage(DEFAULT_BACKGROUND)).toBe(false);
    expect(hasBackgroundImage({ ...DEFAULT_BACKGROUND, imageId: '   ' })).toBe(false);
  });
});

/**
 * Serverdan kelgan sozlama.
 *
 * Fon HISOBDA turadi, shuning uchun server javobi mijozdagi har qanday
 * qiymatdan ustun. Lekin unga ko'r-ko'rona ishonib bo'lmaydi: eski ilova
 * yoki boshqa mijoz noto'g'ri qiymat yuborsa, fon chizilmay qolardi.
 */
describe('fromRemote', () => {
  it('server qiymatini oladi', () => {
    expect(fromRemote({ imageId: 'abc', fit: 'contain', dim: 0.4 })).toEqual({
      imageId: 'abc',
      fit: 'contain',
      dim: 0.4,
    });
  });

  /** Hisobda fon tanlanmagan - standart qiymat, xato emas. */
  it('bosh javob standartga tushadi', () => {
    expect(fromRemote(null)).toEqual(DEFAULT_BACKGROUND);
    expect(fromRemote(undefined)).toEqual(DEFAULT_BACKGROUND);
  });

  it('notogri tur standartga tushadi', () => {
    expect(fromRemote('salom')).toEqual(DEFAULT_BACKGROUND);
    expect(fromRemote([1, 2])).toEqual(DEFAULT_BACKGROUND);
  });

  /** Noma'lum "fit" fonni chizilmas qilib qo'yardi - standartga tushadi. */
  it('notanish fit standartga tushadi', () => {
    expect(fromRemote({ imageId: 'a', fit: 'stretch', dim: 0.5 }).fit).toBe('cover');
  });

  it('xiralik oraliqqa keltiriladi', () => {
    expect(fromRemote({ imageId: 'a', fit: 'cover', dim: 99 }).dim).toBe(MAX_DIM);
    expect(fromRemote({ imageId: 'a', fit: 'cover', dim: null }).dim).toBe(DEFAULT_BACKGROUND.dim);
  });

  it('idsiz javob fon yoq deb oqiladi', () => {
    expect(fromRemote({ fit: 'cover', dim: 0.5 }).imageId).toBe('');
  });
});

/**
 * Qurilmadagi nusxa HAR HISOB UCHUN ALOHIDA.
 *
 * Umumiy kalit bitta telefondagi ikkinchi hisobga birinchisining fonini
 * ko'rsatardi.
 */
describe('backgroundKey', () => {
  it('har hisob oz kalitini oladi', () => {
    expect(backgroundKey('a')).not.toBe(backgroundKey('b'));
  });

  it('bir hisob uchun kalit barqaror', () => {
    expect(backgroundKey('a')).toBe(backgroundKey('a'));
  });
});
