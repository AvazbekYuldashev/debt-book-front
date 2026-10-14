import { renderHook } from '@testing-library/react-native';
import React, { useEffect, useState } from 'react';

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
