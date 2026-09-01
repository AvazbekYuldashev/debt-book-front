import {
  calcResult,
  formatDisplay,
  initialCalcState,
  pressBackspace,
  pressClear,
  pressDigit,
  pressDot,
  pressEquals,
  pressOperator,
  type CalcState,
} from '../calculator';

/** Tugmalar ketma-ketligini bosib chiqadi: "12+3=" kabi. */
const type = (keys: string, start?: string): CalcState => {
  let s = initialCalcState(start);
  for (const k of keys) {
    if (k >= '0' && k <= '9') s = pressDigit(s, k);
    else if (k === '.') s = pressDot(s);
    else if (k === '=') s = pressEquals(s);
    else if (k === 'C') s = pressClear();
    else if (k === '<') s = pressBackspace(s);
    else s = pressOperator(s, k as '+' | '-' | '*' | '/');
  }
  return s;
};

describe('kalkulyator', () => {
  it('to‘rt amal', () => {
    expect(type('2+3=').current).toBe('5');
    expect(type('9-4=').current).toBe('5');
    expect(type('6*7=').current).toBe('42');
    expect(type('8/2=').current).toBe('4');
  });

  it('ketma-ket amal avvalgisini hisoblaydi: 2+3× -> 5', () => {
    expect(type('2+3*').current).toBe('5');
  });

  it('kasrli hisob — suzuvchi nuqta xatosisiz', () => {
    expect(type('0.1+0.2=').current).toBe('0.3');
  });

  // Foydalanuvchi topgan xato: amal bosilgandan keyin darhol "Kiritish".
  it('"2 +" dan keyin Kiritish -> 2, 4 emas', () => {
    expect(calcResult(type('2+'))).toBe('2');
  });

  it('"2 + 3" dan keyin Kiritish -> 5 (tenglik shart emas)', () => {
    expect(calcResult(type('2+3'))).toBe('5');
  });

  it('tenglikdan keyin Kiritish natijani beradi', () => {
    expect(calcResult(type('2+3='))).toBe('5');
  });

  it('ayirish manfiy chiqsa moduli olinadi — yo‘nalishni tugma belgilaydi', () => {
    expect(calcResult(type('3-10='))).toBe('7');
  });

  it('nolga bo‘lish summani buzmaydi', () => {
    expect(Number.isFinite(Number(calcResult(type('8/0='))))).toBe(true);
  });

  it('C tozalaydi, ⌫ oxirgi raqamni o‘chiradi', () => {
    expect(type('123C').current).toBe('0');
    expect(type('123<').current).toBe('12');
  });

  it('boshlang‘ich qiymat maydondan olinadi', () => {
    expect(initialCalcState('1 500').current).toBe('1500');
    expect(initialCalcState('0').current).toBe('0');
    expect(initialCalcState('').current).toBe('0');
  });

  it('ekranda uchlik ajratgich', () => {
    expect(formatDisplay('1234567')).toBe('1 234 567');
    expect(formatDisplay('1234567.5')).toBe('1 234 567.5');
    expect(formatDisplay('-1500')).toBe('-1 500');
  });
});
