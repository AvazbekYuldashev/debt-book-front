import {
  buildDurationLabel,
  formatBackendDateTime,
  formatDateFromDate,
  formatDateInputValue,
  getCurrentWeekRange,
  getPickerDate,
  parseBackendDate,
  splitDateParts,
  updateDatePart,
} from '../date';
import { translate } from '../../i18n';

describe('parseBackendDate / formatBackendDateTime', () => {
  it('ISO datetime — kun/oy chalkashmaydi (11-iyul noyabr bo‘lib ketmaydi)', () => {
    const d = parseBackendDate('2026-07-11T03:22:45');
    expect(d?.getDate()).toBe(11);
    expect(d?.getMonth()).toBe(6); // iyul
    expect(formatBackendDateTime('2026-07-11T03:22:45')).toBe('11.07.2026 03:22');
  });
  it('ISO millisekund bilan ham ishlaydi', () => {
    expect(formatBackendDateTime('2026-07-11T03:22:45.123456')).toBe('11.07.2026 03:22');
  });
  it('bo‘shliqli variant (2026-07-11 03:22)', () => {
    expect(formatBackendDateTime('2026-07-11 03:22')).toBe('11.07.2026 03:22');
  });
  it('faqat sana', () => {
    expect(formatBackendDateTime('2026-07-11')).toBe('11.07.2026 00:00');
  });
  it('dd/MM/yyyy — DD birinchi deb qat’iy talqin qilinadi', () => {
    const d = parseBackendDate('11/07/2026 03:22');
    expect(d?.getDate()).toBe(11);
    expect(d?.getMonth()).toBe(6);
  });
  it('noto‘g‘ri satr — o‘zi qaytadi (parse null)', () => {
    expect(parseBackendDate('abc')).toBeNull();
    expect(formatBackendDateTime('abc')).toBe('abc');
    expect(parseBackendDate('')).toBeNull();
  });
});

describe('formatDateInputValue', () => {
  it('progressiv YYYY-MM-DD ga formatlaydi', () => {
    expect(formatDateInputValue('2024')).toBe('2024');
    expect(formatDateInputValue('202401')).toBe('2024-01');
    expect(formatDateInputValue('20240105')).toBe('2024-01-05');
  });

  it('raqam bo\'lmagan belgilarni tashlaydi va 8 raqam bilan cheklaydi', () => {
    expect(formatDateInputValue('abc2024-01-05xyz')).toBe('2024-01-05');
    expect(formatDateInputValue('202401059999')).toBe('2024-01-05');
  });
});

describe('formatDateFromDate', () => {
  it('lokal sanani YYYY-MM-DD ga aylantiradi', () => {
    expect(formatDateFromDate(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(formatDateFromDate(new Date(2024, 11, 31))).toBe('2024-12-31');
  });
});

describe('getCurrentWeekRange', () => {
  it('dushanbadan berilgan kungacha oraliqni qaytaradi', () => {
    // 2024-01-10 — chorshanba; hafta boshi dushanba 2024-01-08.
    expect(getCurrentWeekRange(new Date(2024, 0, 10))).toEqual({
      fromDate: '2024-01-08',
      endDate: '2024-01-10',
    });
  });

  it('yakshanba uchun o\'sha haftaning dushanbasini oladi', () => {
    // 2024-01-14 — yakshanba; hafta boshi 2024-01-08.
    expect(getCurrentWeekRange(new Date(2024, 0, 14))).toEqual({
      fromDate: '2024-01-08',
      endDate: '2024-01-14',
    });
  });
});

describe('buildDurationLabel', () => {
  // Haqiqiy lug'at: kalitlar va `{param}` interpolyatsiyasi ham tekshiriladi.
  const uz = (key: string, params?: Record<string, string | number>) =>
    translate(key, 'uz', params);
  const ru = (key: string, params?: Record<string, string | number>) =>
    translate(key, 'ru', params);
  const en = (key: string, params?: Record<string, string | number>) =>
    translate(key, 'en', params);

  it('oxirgi kun ham hisobga kiradi (1–6 oktyabr = 6 kun)', () => {
    expect(buildDurationLabel('2026-10-01', '2026-10-06', uz)).toBe('6 kunlik');
  });

  it('bir xil sana — 1 kun (oyning 1-kunida "0 kunlik" chiqmaydi)', () => {
    expect(buildDurationLabel('2024-01-01', '2024-01-01', uz)).toBe('1 kunlik');
  });

  it("to'liq oy — 1 oylik", () => {
    expect(buildDurationLabel('2024-01-01', '2024-01-31', uz)).toBe('1 oylik');
  });

  it('oy va kunlarni hisoblaydi', () => {
    expect(buildDurationLabel('2024-01-01', '2024-03-04', uz)).toBe('2 oy 4 kunlik');
  });

  it('yil, oy va kun birga', () => {
    expect(buildDurationLabel('2023-01-01', '2024-02-02', uz)).toBe('1 yil 1 oy 2 kunlik');
  });

  it('oy oxiridan boshlansa kursor siljimaydi (31-yanvar → 31-mart)', () => {
    // 31-yanvar + 2 oy = 31-mart; oxirgi kun ham kiradi -> 2 oy 1 kun.
    expect(buildDurationLabel('2024-01-31', '2024-03-31', uz)).toBe('2 oy 1 kunlik');
  });

  it('joriy tilda chiqadi (ru / en)', () => {
    expect(buildDurationLabel('2026-10-01', '2026-10-06', ru)).toBe('за 6 дн.');
    expect(buildDurationLabel('2024-01-01', '2024-03-04', en)).toBe('2 mo 4 d');
  });

  it('noto\'g\'ri yoki teskari oraliqda bo\'sh satr qaytaradi', () => {
    expect(buildDurationLabel('2024-03-01', '2024-01-01', uz)).toBe('');
    expect(buildDurationLabel('bad', '2024-01-01', uz)).toBe('');
    expect(buildDurationLabel('2024-01-01', '2024-02-30', uz)).toBe('');
  });
});

describe('splitDateParts / updateDatePart', () => {
  it('YYYY-MM-DD ni qismlarga ajratadi', () => {
    expect(splitDateParts('2024-01-05')).toEqual({ year: '2024', month: '01', day: '05' });
    expect(splitDateParts('')).toEqual({ year: '', month: '', day: '' });
  });

  it('bitta qismni yangilaydi', () => {
    expect(updateDatePart('2024-01-05', 'month', '12')).toBe('2024-12-05');
    expect(updateDatePart('2024-01-05', 'year', '2025')).toBe('2025-01-05');
  });

  it('barcha qismlar bo\'sh bo\'lsa bo\'sh satr qaytaradi', () => {
    expect(updateDatePart('', 'year', '')).toBe('');
  });
});

describe('getPickerDate', () => {
  it('to\'g\'ri satrni Date ga aylantiradi', () => {
    expect(formatDateFromDate(getPickerDate('2024-01-05'))).toBe('2024-01-05');
  });

  it('noto\'g\'ri satr uchun haqiqiy Date qaytaradi', () => {
    expect(getPickerDate('bad').getTime()).not.toBeNaN();
  });
});
