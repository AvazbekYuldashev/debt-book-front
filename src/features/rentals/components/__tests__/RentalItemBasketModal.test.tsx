import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RentalItemBasketModal from '../RentalItemBasketModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { RentalItemResponseDTO } from '../../types/rentalItem';

const onConfirm = jest.fn();
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

const item = (over: Partial<RentalItemResponseDTO>): RentalItemResponseDTO => ({
  id: 'lesa',
  name: 'Lesa',
  period: 'DAY',
  price: 12_000,
  currency: 'UZS',
  unit: 'DONA',
  totalQuantity: 4,
  busyQuantity: 1,
  category: 'QURILISH',
  ...over,
});

const stock = [
  item({}),
  item({ id: 'opalubka', name: 'Opalubka', category: 'QURILISH', totalQuantity: 10, busyQuantity: 0 }),
  item({ id: 'stul', name: 'Stul', category: "To'y", totalQuantity: 50, busyQuantity: 0 }),
  item({ id: 'mikser', name: 'Mikser', period: 'HOUR', category: 'QURILISH' }),
];

const show = async (initial?: { itemId: string; quantity: number }[]) => {
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <RentalItemBasketModal
          visible
          items={stock}
          period="DAY"
          initial={initial}
          onClose={jest.fn()}
          onConfirm={onConfirm}
        />
      </LanguageProvider>
    </AppThemeProvider>,
  );
  await settle();
};

beforeEach(() => onConfirm.mockReset());

/**
 * Ombordan buyum tanlash — narxnoma savati bilan bir xil oqim.
 *
 * Ilgari buyumlar ijara formasining ichida tekis ro'yxat bo'lib turardi:
 * forma cho'zilar, kategoriya ko'rinmas edi.
 */
describe('ijara buyumlarini tanlash', () => {
  it('faqat SHU davrdagi buyumlar chiqadi', async () => {
    await show();

    expect(screen.getByText('Lesa')).toBeTruthy();
    // Soatlik buyum kunlik ijaraga aralashmaydi.
    expect(screen.queryByText('Mikser')).toBeNull();
  });

  it('kategoriya chiplari buyumlardan quriladi', async () => {
    await show();

    expect(screen.getByLabelText('QURILISH')).toBeTruthy();
    expect(screen.getByLabelText("To'y")).toBeTruthy();
  });

  it("kategoriya tanlansa boshqasi ko'rinmaydi", async () => {
    await show();

    fireEvent.press(screen.getByLabelText("To'y"));

    expect(screen.getByText('Stul')).toBeTruthy();
    expect(screen.queryByText('Lesa')).toBeNull();
  });

  it('qidiruv nom bo\'yicha filtrlaydi', async () => {
    await show();

    fireEvent.changeText(screen.getByLabelText('Buyum nomi yoki guruh'), 'opal');

    expect(screen.getByText('Opalubka')).toBeTruthy();
    expect(screen.queryByText('Lesa')).toBeNull();
  });

  it('"+" miqdorni oshiradi va tanlov qaytariladi', async () => {
    await show();

    fireEvent.press(screen.getByLabelText("Lesa ko'paytirish"));
    fireEvent.press(screen.getByLabelText("Lesa ko'paytirish"));
    fireEvent.press(screen.getByText("Tanlovni qo'llash"));

    expect(onConfirm).toHaveBeenCalledWith([{ itemId: 'lesa', quantity: 2 }]);
  });

  it("bo'sh sonidan oshirib bo'lmaydi", async () => {
    await show();

    // Lesa: jami 4, bandi 1 -> bo'sh 3. Beshta bosilsa ham 3 da to'xtaydi.
    for (let i = 0; i < 5; i += 1) {
      fireEvent.press(screen.getByLabelText("Lesa ko'paytirish"));
    }
    fireEvent.press(screen.getByText("Tanlovni qo'llash"));

    expect(onConfirm).toHaveBeenCalledWith([{ itemId: 'lesa', quantity: 3 }]);
  });

  it('oyna formadagi tanlov bilan ochiladi', async () => {
    // Aks holda tuzatmoqchi bo'lgan odam hammasini boshqatdan yig'ardi.
    await show([{ itemId: 'opalubka', quantity: 7 }]);

    expect(screen.getByDisplayValue('7')).toBeTruthy();
  });

  it('tanlanmagan buyum natijaga tushmaydi', async () => {
    await show();

    fireEvent.press(screen.getByLabelText('Stul kamaytirish'));
    fireEvent.press(screen.getByText("Tanlovni qo'llash"));

    expect(onConfirm).toHaveBeenCalledWith([]);
  });
});
