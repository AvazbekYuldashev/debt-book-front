import {
  normalizePhone,
  sanitizeLocalPhone,
  formatPhoneDisplay,
  getPhoneValidationError,
} from '../phone';

describe('normalizePhone', () => {
  it('9 xonali raqamga 998 qo‘shadi', () => {
    expect(normalizePhone('901234567')).toBe('998901234567');
  });
  it('12 xonali 998-li raqamni o‘zgartirmaydi', () => {
    expect(normalizePhone('998901234567')).toBe('998901234567');
  });
  it('0 bilan boshlangan 10 xonalini 998 ga o‘tkazadi', () => {
    expect(normalizePhone('0901234567')).toBe('998901234567');
  });
  it('ajratuvchi belgilarni tozalaydi', () => {
    expect(normalizePhone('+998 90 123 45 67')).toBe('998901234567');
  });
});

describe('sanitizeLocalPhone', () => {
  it('998 prefiksni olib tashlaydi va 9 xonaga qisqartiradi', () => {
    expect(sanitizeLocalPhone('998901234567')).toBe('901234567');
  });
  it('9 xonadan ortig‘ini kesadi', () => {
    expect(sanitizeLocalPhone('9012345678')).toBe('901234567');
  });
});

describe('formatPhoneDisplay', () => {
  it('998XXXXXXXXX -> +998XXXXXXXXX', () => {
    expect(formatPhoneDisplay('998901234567')).toBe('+998901234567');
  });
  it('bo‘sh qiymatda fallback qaytaradi', () => {
    expect(formatPhoneDisplay('', '--')).toBe('--');
  });
});

describe('getPhoneValidationError', () => {
  it('bo‘sh -> empty', () => {
    expect(getPhoneValidationError('')).toBe('empty');
  });
  it('noto‘g‘ri uzunlik -> length', () => {
    expect(getPhoneValidationError('12345')).toBe('length');
  });
  it('12 xona lekin 998siz -> prefix', () => {
    expect(getPhoneValidationError('123901234567')).toBe('prefix');
  });
  it('to‘g‘ri 9 xona -> null', () => {
    expect(getPhoneValidationError('901234567')).toBeNull();
  });
  it('to‘g‘ri 12 xona (998) -> null', () => {
    expect(getPhoneValidationError('998901234567')).toBeNull();
  });
});
