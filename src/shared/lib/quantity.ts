/**
 * Miqdorni odam o'qiydigan qilib formatlaydi: "6", "1.5", "0.25".
 *
 * Backend miqdorni `NUMERIC(19,3)` da saqlaydi, ya'ni JSON'da "6.000" bo'lib
 * kelishi mumkin. Chekda "6.000 dona non" deb yozish g'alati — ortiqcha
 * nollar olib tashlanadi, lekin haqiqiy kasr (1.5 kg) saqlanadi.
 *
 * `toLocaleString` ATAYIN ishlatilmagan: ilovaning qolgan qismi kabi format
 * barcha qurilmalarda bir xil bo'lishi kerak.
 */
export const formatQuantity = (value: number | string | null | undefined): string => {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(numeric)) return '0';
  // 3 xona — bazadagi aniqlik bilan bir xil; keyin ortiqcha nollar kesiladi.
  return String(Number(numeric.toFixed(3)));
};
