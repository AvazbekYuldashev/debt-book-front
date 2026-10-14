import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RentalRequestModal from '../RentalRequestModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { RentalItemResponseDTO } from '../../types/rentalItem';

jest.mock('../../hooks/useRentals');

import { useBusinessRentalItems, useRequestRental } from '../../hooks/useRentals';

const onClose = jest.fn();
const onSubmitted = jest.fn();
const requestMutate = jest.fn();
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

const item = (over: Partial<RentalItemResponseDTO> = {}): RentalItemResponseDTO => ({
  id: 'lesa',
  name: 'Lesa',
  period: 'DAY',
  price: 23_333,
  currency: 'UZS',
  unit: 'DONA',
  totalQuantity: 4,
  busyQuantity: 0,
  ...over,
});

/** Oyna ro'yxat bosqichida ochiladi — qarz oynasidagi "Ijaraga olish" kabi. */
const show = async () => {
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <RentalRequestModal
          businessId="biz-1"
          item={null}
          visible
          onClose={onClose}
          onSubmitted={onSubmitted}
        />
      </LanguageProvider>
    </AppThemeProvider>,
  );
  await settle();
};

beforeEach(() => {
  onClose.mockReset();
  onSubmitted.mockReset();
  requestMutate.mockReset();
  (useRequestRental as jest.Mock).mockReturnValue({ mutate: requestMutate, isPending: false });
  (useBusinessRentalItems as jest.Mock).mockReturnValue({
    data: [item(), item({ id: 'stul', name: 'Stul' })],
    isLoading: false,
  });
});

/**
 * IKKI BOSQICHLI oyna: avval ombor ro'yxati, keyin forma.
 *
 * Buyum tanlangandan keyin ro'yxatga QAYTISH yo'li bo'lishi shart —
 * ilgari faqat "Bekor qilish" bor edi va noto'g'ri buyum bosgan odam
 * butun oqimni yopib, boshidan boshlashga majbur bo'lardi.
 */
describe("ijaraga olish — bosqichlar", () => {
  it("avval ombor ro'yxati ochiladi", async () => {
    await show();

    expect(screen.getByText('Lesa')).toBeTruthy();
    expect(screen.getByText('Stul')).toBeTruthy();
  });

  it('buyum bosilsa forma ochiladi', async () => {
    await show();

    fireEvent.press(screen.getByLabelText(/^Lesa:/));
    await settle();

    expect(screen.getByText('Nechta')).toBeTruthy();
    // Ro'yxat bosqichi tugadi: ikkinchi buyum endi ko'rinmaydi.
    expect(screen.queryByText('Stul')).toBeNull();
  });

  it("formadan ro'yxatga QAYTIB bo'ladi", async () => {
    await show();
    fireEvent.press(screen.getByLabelText(/^Lesa:/));
    await settle();

    fireEvent.press(screen.getByLabelText('Orqaga'));
    await settle();

    // Ro'yxat qaytdi, oyna yopilmadi.
    expect(screen.getByText('Stul')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ro'yxat bosqichida orqaga tugmasi yo'q — qaytadigan joy yo'q", async () => {
    await show();

    expect(screen.queryByLabelText('Orqaga')).toBeNull();
  });

  it("'Bekor qilish' KELGAN JOYGA qaytaradi, yuborish esa yo'q", async () => {
    // Bekor qilgan odam qarz oynasiga qaytadi (u yerda summa yozib
    // qo'ygan bo'lishi mumkin); so'rov yuborilgach qaytadigan joy yo'q.
    await show();

    fireEvent.press(screen.getByText('Bekor qilish'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("yuborilgach `onSubmitted` chaqiriladi, `onClose` emas", async () => {
    await show();
    fireEvent.press(screen.getByLabelText(/^Lesa:/));
    await settle();

    // Muddat bo'sh qoldirilsa ijara muddatsiz bo'ladi — forma to'liq.
    fireEvent.press(screen.getByText('Ijaraga olish'));

    // Mutatsiya muvaffaqiyatli tugadi deb faraz qilamiz.
    const handlers = requestMutate.mock.calls[0][1];
    act(() => handlers.onSuccess());

    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
