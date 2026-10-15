import React from 'react';
import { TextInput } from 'react-native';
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

/** Oyna TANLASH bosqichida ochiladi — qarz oynasidagi "Ijaraga olish" kabi. */
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

/** Savatdan buyum olib, formaga o'tish. */
const pick = async (name: string, times = 1) => {
  for (let i = 0; i < times; i += 1) {
    fireEvent.press(screen.getByLabelText(`${name} ko'paytirish`));
  }
  fireEvent.press(screen.getByText("Tanlovni qo'llash"));
  await settle();
};

/** Sarlavha ham, tugma ham "Ijaraga olish" — tugma oxirida turadi. */
const submit = () => {
  const matches = screen.getAllByText('Ijaraga olish');
  fireEvent.press(matches[matches.length - 1]);
};

beforeEach(() => {
  onClose.mockReset();
  onPicked.mockReset();
  onBack.mockReset();
  (useBusinessRentalItems as jest.Mock).mockReturnValue({
    data: [item(), item({ id: 'stul', name: 'Stul', price: 5_000, totalQuantity: 50 })],
    isLoading: false,
  });
});

/**
 * MIJOZNING IJARA OQIMI: savatdan tanlash, keyin muddat/sana.
 *
 * Tanlash narxnoma savati bilan ayni oyna: qidiruv, kategoriya va har
 * qator yonida miqdor. Ilgari oddiy ro'yxat edi — bir vaqtda bitta
 * buyum va tanlanganini qaytarib olish yo'li yo'q edi.
 *
 * Yozuv bu yerda YARATILMAYDI: u "Qarz berish" bilan birga saqlanadi,
 * aks holda ijara ham darhol qarz bo'lib, summa Miqdorda ham turib,
 * bitta pul ikki marta sanalardi.
 */
describe('ijaraga olish oqimi', () => {
  it('avval SAVAT ochiladi — qidiruv va miqdor bilan', async () => {
    await show();

    expect(screen.getByLabelText('Buyum nomi yoki guruh')).toBeTruthy();
    expect(screen.getByLabelText("Lesa ko'paytirish")).toBeTruthy();
    expect(screen.getByLabelText('Stul kamaytirish')).toBeTruthy();
  });

  it("bir NECHTA buyum bitta so'rov bo'lib ketadi", async () => {
    await show();

    fireEvent.press(screen.getByLabelText("Lesa ko'paytirish"));
    fireEvent.press(screen.getByLabelText("Stul ko'paytirish"));
    fireEvent.press(screen.getByLabelText("Stul ko'paytirish"));
    fireEvent.press(screen.getByText("Tanlovni qo'llash"));
    await settle();

    submit();

    expect(onPicked).toHaveBeenCalledTimes(1);
    const [draft] = onPicked.mock.calls[0];
    expect(draft.lines).toEqual([
      { rentalItemId: 'lesa', quantity: 1 },
      { rentalItemId: 'stul', quantity: 2 },
    ]);
  });

  it('summa tanlangan buyumlar va muddatdan chiqadi', async () => {
    await show();
    await pick('Lesa', 2);

    // 2 × 23 333 × 3 kun. `Input` da accessibilityLabel yo'q, shuning
    // uchun formadagi birinchi maydon (muddat) turi bo'yicha topiladi.
    fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], '3');
    submit();

    const [, total] = onPicked.mock.calls[0];
    expect(total).toBe(2 * 23_333 * 3);
  });

  it('tanlov YUBORILMAYDI — forma bilan birga saqlanadi', async () => {
    await show();
    await pick('Lesa');

    submit();

    expect(onPicked).toHaveBeenCalledTimes(1);
    // Oyna bir qadam orqaga qaytadi.
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("formadan SAVATGA qaytib, tanlovni o'zgartirib bo'ladi", async () => {
    await show();
    await pick('Lesa');

    fireEvent.press(screen.getByLabelText('Orqaga'));
    await settle();

    // Savat qaytdi va avvalgi tanlov joyida.
    expect(screen.getByDisplayValue('1')).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
  });

  it("savat bosqichida 'Bekor qilish' KELGAN JOYGA qaytaradi", async () => {
    await show();

    // Forma ham, savat ham bir vaqtda chiziladi — savatniki oxirgisi.
    const buttons = screen.getAllByText('Bekor qilish');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPicked).not.toHaveBeenCalled();
  });

  it("bo'sh sonidan ko'p olishga yo'l qo'ymaydi", async () => {
    (useBusinessRentalItems as jest.Mock).mockReturnValue({
      data: [item({ totalQuantity: 4, busyQuantity: 3 })],
      isLoading: false,
    });
    await show();

    // Bo'sh 1 ta: beshta bosilsa ham savat 1 da to'xtaydi.
    await pick('Lesa', 5);
    submit();

    const [draft] = onPicked.mock.calls[0];
    expect(draft.lines).toEqual([{ rentalItemId: 'lesa', quantity: 1 }]);
  });
});
