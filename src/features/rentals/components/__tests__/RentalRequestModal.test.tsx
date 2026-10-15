import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RentalRequestModal from '../RentalRequestModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { RentalItemResponseDTO } from '../../types/rentalItem';

jest.mock('../../hooks/useRentals');

import { useBusinessRentalItems } from '../../hooks/useRentals';

const onClose = jest.fn();
const onPicked = jest.fn();
const onBack = jest.fn();
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
const show = async (withBack = true) => {
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <RentalRequestModal
          businessId="biz-1"
          item={null}
          visible
          onClose={onClose}
          onPicked={onPicked}
          onBack={withBack ? onBack : undefined}
        />
      </LanguageProvider>
    </AppThemeProvider>,
  );
  await settle();
};

beforeEach(() => {
  onClose.mockReset();
  onPicked.mockReset();
  onBack.mockReset();
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

  it("ro'yxat bosqichidan KELGAN JOYGA qaytiladi", async () => {
    // Odam u yerdan "Narxnomadan tanlash" ga o'tmoqchi bo'lishi mumkin —
    // buning uchun butun oqimni yopishi shart emas.
    await show();

    fireEvent.press(screen.getByLabelText('Orqaga'));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("qaytadigan joy bo'lmasa orqaga tugmasi chiqmaydi", async () => {
    await show(false);

    expect(screen.queryByLabelText('Orqaga')).toBeNull();
  });

  it("formadagi orqaga RO'YXATGA qaytaradi, kelgan joyga emas", async () => {
    await show();
    fireEvent.press(screen.getByLabelText(/^Lesa:/));
    await settle();

    fireEvent.press(screen.getByLabelText('Orqaga'));
    await settle();

    expect(screen.getByText('Stul')).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
  });

  it("'Bekor qilish' KELGAN JOYGA qaytaradi", async () => {
    // Odam qarz oynasida summa yozib qo'ygan bo'lishi mumkin.
    await show();

    fireEvent.press(screen.getByText('Bekor qilish'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("tanlov YUBORILMAYDI — forma bilan birga saqlanadi", async () => {
    // Narxnoma savati bilan bir xil: tanlov formani to'ldiradi, yozuv
    // esa "Qarz berish" bosilganda yaratiladi. Aks holda ijara ham
    // darhol qarz bo'lib, summa Miqdorda ham turib, ikki marta
    // sanalardi.
    await show();
    fireEvent.press(screen.getByLabelText(/^Lesa:/));
    await settle();

    // Muddat bo'sh qoldirilsa ijara muddatsiz bo'ladi — forma to'liq.
    fireEvent.press(screen.getByText('Ijaraga olish'));

    expect(onPicked).toHaveBeenCalledTimes(1);
    const [draft] = onPicked.mock.calls[0];
    expect(draft.lines).toEqual([{ rentalItemId: 'lesa', quantity: 1 }]);
    // Oyna bir qadam orqaga qaytadi.
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
