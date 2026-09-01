export type Operator = '+' | '-' | '*' | '/';

/** Kalkulyator holati. `entering` — amaldan keyin yangi raqam kiritilganmi. */
export interface CalcState {
  /** Ekranda turgan son (matn: kiritish jarayonidagi "12." ham bo'lishi mumkin). */
  current: string;
  /** Amal bosilgunga qadar to'plangan chap tomon. */
  pending: { value: number; op: Operator } | null;
  /** Keyingi raqam eskisining USTIGA yoziladimi (amal yoki "=" dan keyin). */
  replaceNext: boolean;
}

export const initialCalcState = (start?: string): CalcState => {
  const cleaned = (start ?? '').replace(/\s/g, '').replace(',', '.');
  const usable = cleaned && Number.isFinite(Number(cleaned)) && Number(cleaned) !== 0;
  return { current: usable ? cleaned : '0', pending: null, replaceNext: true };
};

export const applyOp = (left: number, right: number, op: Operator): number => {
  switch (op) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      // Nolga bo'lish: amalni bajarmaymiz, chap tomon o'zgarishsiz qoladi.
      // Cheksizlik yoki NaN ni summa maydoniga yuborish xavfli.
      return right === 0 ? left : left / right;
  }
};

/** Suzuvchi nuqta xatolarini yig'ishtiradi: 0.1+0.2 -> 0.3, 12 -> 12. */
export const clean = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  return String(Math.round(value * 1e6) / 1e6);
};

export const pressDigit = (s: CalcState, digit: string): CalcState => ({
  ...s,
  current: s.replaceNext ? digit : s.current === '0' ? digit : s.current + digit,
  replaceNext: false,
});

export const pressDot = (s: CalcState): CalcState => ({
  ...s,
  current: s.replaceNext ? '0.' : s.current.includes('.') ? s.current : `${s.current}.`,
  replaceNext: false,
});

export const pressOperator = (s: CalcState, op: Operator): CalcState => {
  const value = Number(s.current) || 0;
  // Ketma-ket amal bosilsa avvalgisi darhol hisoblanadi: 2+3× -> 5×
  const left = s.pending && !s.replaceNext ? applyOp(s.pending.value, value, s.pending.op) : value;
  return { current: clean(left), pending: { value: left, op }, replaceNext: true };
};

export const pressEquals = (s: CalcState): CalcState => {
  if (!s.pending) return s;
  const result = applyOp(s.pending.value, Number(s.current) || 0, s.pending.op);
  return { current: clean(result), pending: null, replaceNext: true };
};

export const pressClear = (): CalcState => ({ current: '0', pending: null, replaceNext: true });

export const pressBackspace = (s: CalcState): CalcState => ({
  ...s,
  current: s.replaceNext || s.current.length <= 1 ? '0' : s.current.slice(0, -1),
  replaceNext: false,
});

/**
 * "Kiritish" bosilganda maydonga tushadigan son.
 *
 * Kutilayotgan amal FAQAT undan keyin yangi raqam kiritilgan bo'lsa
 * yakunlanadi. Ilgari bunday tekshiruv yo'q edi: "2 +" dan keyin
 * Kiritish bosilsa apply(2, 2, '+') = 4 chiqardi — foydalanuvchi esa
 * 2 ni kutgan edi.
 *
 * Manfiy natija musbatga aylantiriladi: summa maydoni yo'nalishni
 * o'zi bilmaydi, uni "berdim/oldim" tugmasi belgilaydi.
 */
export const calcResult = (s: CalcState): string => {
  const finished =
    s.pending && !s.replaceNext
      ? applyOp(s.pending.value, Number(s.current) || 0, s.pending.op)
      : Number(s.current) || 0;
  return clean(Math.abs(finished));
};

/** Ekrandagi sonni o'qish uchun ajratadi: 1234567.5 -> "1 234 567.5". */
export const formatDisplay = (value: string): string => {
  const negative = value.startsWith('-');
  const body = negative ? value.slice(1) : value;
  const [int, dec] = body.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const text = dec === undefined ? grouped : `${grouped}.${dec}`;
  return negative ? `-${text}` : text;
};
