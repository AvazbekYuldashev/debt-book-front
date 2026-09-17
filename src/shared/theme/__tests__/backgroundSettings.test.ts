import {
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
