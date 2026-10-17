import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RentalRequestModal from '../RentalRequestModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { RentalItemResponseDTO } from '../../types/rentalItem';

jest.mock('../../hooks/useRentals');

import { useBusinessRentalItems, useRentalItems } from '../../hooks/useRentals';

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
const pick = async (name: string, times = 1, days = 0) => {
  for (let i = 0; i < times; i += 1) {
    fireEvent.press(screen.getByLabelText(`${name} miqdor ko'paytirish`));
  }
  for (let i = 0; i < days; i += 1) {
    fireEvent.press(screen.getByLabelText(`${name} Kunlik ko'paytirish`));
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
  (useRentalItems as jest.Mock).mockReturnValue({ data: [], isLoading: false });
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
    expect(screen.getByLabelText("Lesa miqdor ko'paytirish")).toBeTruthy();
    expect(screen.getByLabelText('Stul miqdor kamaytirish')).toBeTruthy();
  });

  it("bir NECHTA buyum bitta so'rov bo'lib ketadi", async () => {
    await show();

    fireEvent.press(screen.getByLabelText("Lesa miqdor ko'paytirish"));
    fireEvent.press(screen.getByLabelText("Stul miqdor ko'paytirish"));
    fireEvent.press(screen.getByLabelText("Stul miqdor ko'paytirish"));
    fireEvent.press(screen.getByText("Tanlovni qo'llash"));
    await settle();

    submit();

    expect(onPicked).toHaveBeenCalledTimes(1);
    const [picked] = onPicked.mock.calls[0];
    expect(picked).toHaveLength(1);
    expect(picked[0].draft.lines).toEqual([
      { rentalItemId: 'lesa', quantity: 1 },
      { rentalItemId: 'stul', quantity: 2 },
    ]);
  });

  it('summa tanlangan buyumlar va muddatdan chiqadi', async () => {
    await show();
    await pick('Lesa', 2, 3);

    submit();

    const [picked] = onPicked.mock.calls[0];
    expect(picked[0].total).toBe(2 * 23_333 * 3);
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

  it("tanlovdan KEYIN ham 'Bekor qilish' oqimni yopadi", async () => {
    // Savat formaning ichidagi qadam: "x" formaga qaytaradi, "Bekor
    // qilish" esa odam kutganidek butun oqimni tashlaydi. Ilgari
    // ikkisi bitta yo'l edi va bekor qilish hech narsa qilmagandek
    // ko'rinardi.
    await show();
    await pick('Lesa');

    // Formadan savatga qaytamiz.
    fireEvent.press(screen.getByLabelText('Orqaga'));
    await settle();

    const buttons = screen.getAllByText('Bekor qilish');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('qayta ochilganda TANLOV joyida turadi', async () => {
    // Narxnoma savati kabi: oyna avvalgi tanlov bilan ochiladi va
    // forma ko'rinadi - odam "tanlaganim qani?" demasligi kerak.
    render(
      <AppThemeProvider>
        <LanguageProvider>
          <RentalRequestModal
            businessId="biz-1"
            item={null}
            visible
            onClose={onClose}
            onPicked={onPicked}
            initialPicks={[{ itemId: 'lesa', quantity: 2, duration: 3 }]}
          />
        </LanguageProvider>
      </AppThemeProvider>,
    );
    await settle();

    // Savat emas, FORMA ochildi va tanlov ko'rinib turibdi.
    expect(screen.getByText(/Lesa × 2/)).toBeTruthy();
  });

  it("O'Z omboridan berish ham shu oynada", async () => {
    // Ijaraga berish ham qarz berish: buyum odamga ketadi, puli qarz
    // bo'lib qoladi. Ombor boshqa endpointdan keladi.
    (useRentalItems as jest.Mock).mockReturnValue({
      data: [item({ name: 'Opalubka', price: 3_000 })],
      isLoading: false,
    });
    render(
      <AppThemeProvider>
        <LanguageProvider>
          <RentalRequestModal
            businessId=""
            item={null}
            visible
            ownStock
            onClose={onClose}
            onPicked={onPicked}
          />
        </LanguageProvider>
      </AppThemeProvider>,
    );
    await settle();

    fireEvent.press(screen.getByLabelText("Opalubka miqdor ko'paytirish"));
    fireEvent.press(screen.getByText("Tanlovni qo'llash"));
    await settle();

    // Sarlavha ham, tugma ham BERISH haqida.
    const buttons = screen.getAllByText('Ijaraga berish');
    fireEvent.press(buttons[buttons.length - 1]);

    const [picked] = onPicked.mock.calls[0];
    expect(picked[0].draft.lines).toEqual([{ rentalItemId: 'lesa', quantity: 1 }]);
    expect(picked[0].period).toBe('DAY');
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

    const [picked] = onPicked.mock.calls[0];
    expect(picked[0].draft.lines).toEqual([{ rentalItemId: 'lesa', quantity: 1 }]);
  });
});
