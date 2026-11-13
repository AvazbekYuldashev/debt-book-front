import { act, renderHook } from '@testing-library/react-native';
import React, { useEffect, useState } from 'react';

/**
 * FORMA QACHON TOZALANADI.
 *
 * Tozalash `visible` ga emas, `resetKey` ga bog'langan: oyna vaqtincha
 * yopilib qaytishi mumkin (masalan boshqa modal ustiga chiqqanda) va
 * odam yozgan summa yo'qolmasligi kerak. Chaqiruvchi kalitni YANGI oqim
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
