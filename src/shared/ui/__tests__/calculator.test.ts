import {
  calcResult,
  displayExpression,
  displayResult,
  evaluate,
  formatDisplay,
  initialCalcState,
  pressBackspace,
  pressClear,
  pressDigit,
  pressDot,
  pressEquals,
  pressOperator,
  type CalcState,
  type Operator,
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
    else s = pressOperator(s, k as Operator);
  }
  return s;
};

describe('kalkulyator — amallar tartibi', () => {
  // Foydalanuvchi bergan misol. Chapdan o'ngga hisoblaganda 2 490 634
  // chiqardi: ko'paytirish qo'shishdan oldin bajarilishi kerak.
  it('3200×30+3500×25+34+3100 = 186634', () => {
    expect(evaluate('3200×30+3500×25+34+3100')).toBe(186634);
  });

  it('25×3+2×10+10×2+5 = 120', () => {
    expect(evaluate('25×3+2×10+10×2+5')).toBe(120);
  });

  it('ko‘paytirish qo‘shishdan oldin', () => {
    expect(evaluate('2+3×4')).toBe(14);
    expect(evaluate('2×3+4')).toBe(10);
  });

  it('bo‘lish ham qo‘shishdan oldin', () => {
    expect(evaluate('10+20÷4')).toBe(15);
    expect(evaluate('100÷4−5')).toBe(20);
  });

  it('ketma-ket ko‘paytirish/bo‘lish chapdan o‘ngga', () => {
    expect(evaluate('100÷5×2')).toBe(40);
  });
});

describe('kalkulyator — kiritish', () => {
  it('ifoda tugmalar bosilgan holda yig‘iladi', () => {
    expect(type('12+3×4').expression).toBe('12+3×4');
  });

  it('ketma-ket amal oxirgisini almashtiradi', () => {
    expect(type('5+×').expression).toBe('5×');
  });

  it('ifoda amaldan boshlanmaydi', () => {
    expect(type('+5').expression).toBe('5');
  });

  it('bitta sonda ikkita nuqta bo‘lmaydi', () => {
    expect(type('1.2.5').expression).toBe('1.25');
  });

  it('yangi sondan keyin nuqta yana ruxsat etiladi', () => {
    expect(type('1.5+2.5').expression).toBe('1.5+2.5');
  });

  it('yakka nolni raqam almashtiradi', () => {
    expect(type('05').expression).toBe('5');
  });

  it('tugallanmagan kasrdan keyin amal nuqtani tashlaydi', () => {
    expect(type('5.+').expression).toBe('5+');
  });

  it('C tozalaydi, ⌫ oxirgi belgini o‘chiradi', () => {
    expect(type('12+3C').expression).toBe('');
    expect(type('12+3<').expression).toBe('12+');
  });

  it('tenglik ifodani natija bilan almashtiradi va davom ettirsa bo‘ladi', () => {
    const s = type('2+3=');
    expect(s.expression).toBe('5');
    expect(type('×4', s.expression).expression).toBe('5×4');
  });
});

describe('kalkulyator — natija', () => {
  it('tugallanmagan amal e’tiborsiz qoldiriladi', () => {
    expect(calcResult(type('2+3+'))).toBe('5');
  });

  it('tenglik bosilmasa ham natija beradi', () => {
    expect(calcResult(type('3200×30+3500×25+34+3100'))).toBe('186634');
  });

  it('kasrli hisob — suzuvchi nuqta xatosisiz', () => {
    expect(evaluate('0.1+0.2')).toBe(0.3);
  });

  it('manfiy natijaning moduli olinadi — yo‘nalishni tugma belgilaydi', () => {
    expect(calcResult(type('3−10'))).toBe('7');
  });

  it('nolga bo‘lish summani buzmaydi', () => {
    expect(Number.isFinite(Number(calcResult(type('8÷0'))))).toBe(true);
  });

  it('bo‘sh ifoda -> 0', () => {
    expect(calcResult(initialCalcState())).toBe('0');
    expect(evaluate('')).toBeNull();
  });
});

describe('kalkulyator — ekran', () => {
  it('yuqorida ifoda, pastda natija', () => {
    const s = type('25×3+2×10');
    expect(displayExpression(s)).toBe('25×3+2×10');
    expect(displayResult(s)).toBe('95');
  });

  it('yakka son kiritilganda natija takrorlanmaydi', () => {
    expect(displayResult(type('120'))).toBeNull();
  });

  it('katta natijada uchlik ajratgich', () => {
    expect(displayResult(type('3200×30+3500×25+34+3100'))).toBe('186 634');
  });

  it('formatDisplay', () => {
    expect(formatDisplay('1234567')).toBe('1 234 567');
    expect(formatDisplay('1234567.5')).toBe('1 234 567.5');
    expect(formatDisplay('-1500')).toBe('-1 500');
  });

  it('boshlang‘ich qiymat maydondan olinadi', () => {
    expect(initialCalcState('1 500').expression).toBe('1500');
    expect(initialCalcState('0').expression).toBe('');
    expect(initialCalcState('').expression).toBe('');
  });
});
