import { act, renderHook } from '@testing-library/react-native';
import React, { useEffect, useRef, useState } from 'react';

/**
 * FORMA QACHON TOZALANADI.
 *
 * Qarz oynasi ijara oqimiga o'tganda vaqtincha yopiladi. Ilgari tozalash
 * `visible` ga bog'langan edi va qaytganda odam yozgan summa ham,
 * savatdagi mahsulotlar ham yo'qolardi — odam "narxnomadan ham oldim"
 * desa, aslida faqat ijara yozilib qolardi.
 *
 * Shu sababli tozalash `resetKey` ga ko'chdi: chaqiruvchi uni YANGI oqim
 * boshlanganda o'zgartiradi, qaytishda esa tegmaydi. Quyidagi test aynan
 * shu qoidani qulflaydi (oynaning o'zi emas — qoida).
 */
function useFormReset(resetKey: number, visible: boolean) {
  const [value, setValue] = useState('');
  const [resets, setResets] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setValue('');
    setResets((count) => count + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return { value, setValue, resets };
}

describe('qarz formasi tozalanishi', () => {
  it("vaqtincha yopilib qaytganda TOZALANMAYDI", () => {
    const { result, rerender } = renderHook(
      ({ key, visible }: { key: number; visible: boolean }) => useFormReset(key, visible),
      { initialProps: { key: 1, visible: true } },
    );
    const before = result.current.resets;

    // Ijara oqimiga o'tildi va qaytildi: kalit o'zgarmadi.
    rerender({ key: 1, visible: false });
    rerender({ key: 1, visible: true });

    expect(result.current.resets).toBe(before);
  });

  it('yangi oqim boshlanganda TOZALANADI', () => {
    const { result, rerender } = renderHook(
      ({ key, visible }: { key: number; visible: boolean }) => useFormReset(key, visible),
      { initialProps: { key: 1, visible: true } },
    );
    const before = result.current.resets;

    // "Oldim"/"Berdim" qayta bosildi — kalit o'zgardi.
    rerender({ key: 2, visible: true });

    expect(result.current.resets).toBe(before + 1);
  });
});

/**
 * IJARA SUMMASI miqdorga qo'shiladi va QAYTARIB olinadi.
 *
 * Tanlov yozuv yaratmaydi, shuning uchun uni bekor qilish ham mumkin
 * bo'lishi kerak. Farq qo'llanadi (yig'indi emas): qayta render summani
 * ikkilantirmasligi, bekor qilish esa ayirishi kerak.
 */
function useAmountFromRent(rentInAmount: number) {
  const [amount, setAmount] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    const delta = rentInAmount - last.current;
    last.current = rentInAmount;
    if (delta === 0) return;
    setAmount((base) => Math.max(0, base + delta));
  }, [rentInAmount]);

  return { amount, setAmount };
}

describe("ijara summasi miqdorda", () => {
  it('qayta render summani IKKILANTIRMAYDI', () => {
    const { result, rerender } = renderHook(
      ({ sum }: { sum: number }) => useAmountFromRent(sum),
      { initialProps: { sum: 0 } },
    );

    rerender({ sum: 23_333 });
    rerender({ sum: 23_333 });

    expect(result.current.amount).toBe(23_333);
  });

  it("tanlov bekor qilinsa summa AYRILADI", () => {
    const { result, rerender } = renderHook(
      ({ sum }: { sum: number }) => useAmountFromRent(sum),
      { initialProps: { sum: 0 } },
    );

    rerender({ sum: 23_333 });
    rerender({ sum: 0 });

    expect(result.current.amount).toBe(0);
  });

  it("qo'lda yozilgan qism JOYIDA qoladi", () => {
    const { result, rerender } = renderHook(
      ({ sum }: { sum: number }) => useAmountFromRent(sum),
      { initialProps: { sum: 0 } },
    );

    // Odam 100 000 yozdi, keyin 23 333 lik ijara tanladi va bekor qildi.
    act(() => result.current.setAmount(100_000));
    rerender({ sum: 23_333 });
    rerender({ sum: 0 });

    expect(result.current.amount).toBe(100_000);
  });
});
