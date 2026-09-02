export type Operator = '+' | '−' | '×' | '÷';

const OPERATORS: readonly string[] = ['+', '−', '×', '÷'];
/** Klaviaturadan yoki eski ma'lumotdan kelishi mumkin bo'lgan muqobil belgilar. */
const ALIASES: Record<string, Operator> = { '-': '−', '*': '×', '/': '÷' };

/**
 * Kalkulyator holati — foydalanuvchi kiritgan IFODANING o'zi.
 *
 * Telefon kalkulyatorlaridagi kabi: butun ifoda ekranda turadi
 * ("3200×30+3500×25+34+3100"), pastda esa uning joriy natijasi.
 *
 * Ilgari bu "chap tomon + kutilayotgan amal" ko'rinishida edi va
 * chapdan o'ngga hisoblardi: 3200×30+3500×25 uchun (3200×30+3500)×25
 * chiqib, 186 634 o'rniga 2 490 634 berardi. Ko'paytirish va bo'lish
 * qo'shish/ayirishdan OLDIN bajarilishi kerak.
 */
export interface CalcState {
  expression: string;
}

const isOperator = (ch: string): boolean => OPERATORS.includes(ch);

/** Ifodaning oxiridagi tugallanmagan son ("3200×30" -> "30"). */
const lastNumber = (expression: string): string => {
  let i = expression.length;
  while (i > 0 && !isOperator(expression[i - 1])) i -= 1;
  return expression.slice(i);
};

export const initialCalcState = (start?: string): CalcState => {
  const cleaned = (start ?? '').replace(/\s/g, '').replace(',', '.');
  const usable = /^\d*\.?\d*$/.test(cleaned) && cleaned !== '' && Number(cleaned) !== 0;
  return { expression: usable ? cleaned : '' };
};

export const pressDigit = (s: CalcState, digit: string): CalcState => {
  const tail = lastNumber(s.expression);
  // Yakka "0" dan keyin raqam bosilsa nolni almashtiramiz: "05" bo'lmasin.
  if (tail === '0') return { expression: s.expression.slice(0, -1) + digit };
  return { expression: s.expression + digit };
};

export const pressDot = (s: CalcState): CalcState => {
  const tail = lastNumber(s.expression);
  if (tail.includes('.')) return s;
  return { expression: s.expression + (tail === '' ? '0.' : '.') };
};

export const pressOperator = (s: CalcState, op: Operator): CalcState => {
  if (s.expression === '') return s; // ifoda amaldan boshlanmaydi
  const last = s.expression[s.expression.length - 1];
  // Ketma-ket amal bosilsa oxirgisi almashadi: "5+" keyin "×" -> "5×"
  if (isOperator(last)) return { expression: s.expression.slice(0, -1) + op };
  // Tugallanmagan kasr: "5." keyin amal -> "5×"
  if (last === '.') return { expression: s.expression.slice(0, -1) + op };
  return { expression: s.expression + op };
};

export const pressClear = (): CalcState => ({ expression: '' });

export const pressBackspace = (s: CalcState): CalcState => ({
  expression: s.expression.slice(0, -1),
});

/** Tenglik: ifoda o'z natijasi bilan almashadi, hisobni davom ettirish mumkin. */
export const pressEquals = (s: CalcState): CalcState => {
  const value = evaluate(s.expression);
  return { expression: value === null ? s.expression : clean(value) };
};

/** Suzuvchi nuqta xatolarini yig'ishtiradi: 0.1+0.2 -> 0.3, 12 -> 12. */
export const clean = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  return String(Math.round(value * 1e6) / 1e6);
};

type Token = number | Operator;

/** Ifodani sonlar va amallarga ajratadi. Oxiridagi tugallanmagan amal tashlanadi. */
const tokenize = (expression: string): Token[] => {
  const tokens: Token[] = [];
  let current = '';
  for (const raw of expression) {
    const ch = ALIASES[raw] ?? raw;
    if (isOperator(ch)) {
      if (current === '' || current === '.') return tokens; // "5+" yoki "5.+"
      tokens.push(Number(current));
      tokens.push(ch as Operator);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current !== '' && current !== '.') tokens.push(Number(current));
  // Oxiri amal bilan tugasa (masalan "5+") uni tashlaymiz.
  if (tokens.length && typeof tokens[tokens.length - 1] !== 'number') tokens.pop();
  return tokens;
};

/**
 * Ifodani AMALLAR TARTIBI bilan hisoblaydi: avval × va ÷, keyin + va −.
 *
 * @returns natija; ifoda bo'sh yoki noto'g'ri bo'lsa null.
 */
export const evaluate = (expression: string): number | null => {
  const tokens = tokenize(expression);
  if (tokens.length === 0) return null;

  // 1-bosqich: ko'paytirish va bo'lish.
  const folded: Token[] = [tokens[0]];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i] as Operator;
    const right = tokens[i + 1] as number;
    if (typeof right !== 'number') break;
    if (op === '×' || op === '÷') {
      const left = folded.pop() as number;
      // Nolga bo'lish: chap tomonni o'zgarishsiz qoldiramiz — cheksizlikni
      // summa maydoniga yuborib bo'lmaydi.
      folded.push(op === '×' ? left * right : right === 0 ? left : left / right);
    } else {
      folded.push(op, right);
    }
  }

  // 2-bosqich: qo'shish va ayirish.
  let result = folded[0] as number;
  for (let i = 1; i < folded.length; i += 2) {
    const op = folded[i] as Operator;
    const right = folded[i + 1] as number;
    if (typeof right !== 'number') break;
    result = op === '+' ? result + right : result - right;
  }
  if (!Number.isFinite(result)) return null;
  // Suzuvchi nuqta shovqinini shu yerda yig'ishtiramiz: 0.1+0.2 -> 0.3.
  // Yaxlitlash faqat ko'rsatishda bo'lsa, natija boshqa hisoblarga
  // "0.30000000000000004" bo'lib o'tib ketardi.
  return Math.round(result * 1e6) / 1e6;
};

/**
 * "Kiritish" bosilganda maydonga tushadigan son.
 *
 * Manfiy natija musbatga aylantiriladi: summa maydoni yo'nalishni
 * o'zi bilmaydi, uni "berdim/oldim" tugmasi belgilaydi.
 */
export const calcResult = (s: CalcState): string => {
  const value = evaluate(s.expression);
  return clean(Math.abs(value ?? 0));
};

/** Ekrandagi sonni o'qish uchun ajratadi: 186634 -> "186 634". */
export const formatDisplay = (value: string): string => {
  const negative = value.startsWith('-');
  const body = negative ? value.slice(1) : value;
  const [int, dec] = body.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const text = dec === undefined ? grouped : `${grouped}.${dec}`;
  return negative ? `-${text}` : text;
};

/** Ekranning yuqori qatori: ifodaning o'zi (bo'sh bo'lsa nol). */
export const displayExpression = (s: CalcState): string => s.expression || '0';

/** Ekranning pastki qatori: joriy natija; hali hisoblanmasa null. */
export const displayResult = (s: CalcState): string | null => {
  const value = evaluate(s.expression);
  if (value === null) return null;
  // Yakka son kiritilgan bo'lsa natijani takrorlash ortiqcha.
  if (!/[+\-−*×/÷]/.test(s.expression)) return null;
  return formatDisplay(clean(value));
};
