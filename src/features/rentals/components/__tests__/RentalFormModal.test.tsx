import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RentalFormModal from '../RentalFormModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import { formatDateFromDate } from '../../../../shared/lib/date';
import type { RentalItemResponseDTO } from '../../types/rentalItem';

jest.mock('../../hooks/useRentals');

import { useCreateRentalBatch, useRentalItems, useUpdateRental } from '../../hooks/useRentals';

const createMutate = jest.fn();

const stockItem = (over: Partial<RentalItemResponseDTO>): RentalItemResponseDTO => ({
  id: 'lesa',
  name: 'Lesa',
  period: 'DAY',
  price: 5000,
  currency: 'UZS',
  unit: 'DONA',
  totalQuantity: 100,
  busyQuantity: 50,
  ...over,
});

const show = () =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <RentalFormModal visible onClose={jest.fn()} client={{ id: 'c1', name: 'Akmal' }} />
      </LanguageProvider>
    </AppThemeProvider>,
  );

/** Sarlavha ham, tugma ham "Ijaraga berish" — tugma oxirida turadi. */
const submit = () => {
  const matches = screen.getAllByText('Ijaraga berish', { exact: true });
  fireEvent.press(matches[matches.length - 1]);
};

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

/**
 * Buyum TANLASH OYNASIDAN olinadi.
 *
 * Ilgari ro'yxat formaning ichida tekis turardi va test shunchaki
 * buyum nomiga bosardi. Endi oqim "Narxnomadan tanlash" bilan bir xil:
 * punkt -> oyna -> miqdor -> qo'llash.
 */
const pickItems = async (picks: [string, string][]) => {
  fireEvent.press(screen.getByLabelText('Ombordan tanlash'));
  await settle();
  for (const [name, quantity] of picks) {
    fireEvent.changeText(screen.getByLabelText(`${name} miqdor`), quantity);
  }
  fireEvent.press(screen.getByText("Tanlovni qo'llash"));
  await settle();
};

beforeEach(() => {
  createMutate.mockReset();
  (useCreateRentalBatch as jest.Mock).mockReturnValue({ mutate: createMutate, isPending: false });
  (useUpdateRental as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
  (useRentalItems as jest.Mock).mockReturnValue({
    data: [
      stockItem({}),
      stockItem({ id: 'opalubka', name: 'Opalubka', unit: 'METR_KVADRAT', price: 3000, totalQuantity: 500, busyQuantity: 0 }),
      stockItem({ id: 'mixer', name: 'Beton aralashtirgich', period: 'HOUR', price: 20000, busyQuantity: 0 }),
    ],
    isLoading: false,
  });
});

/**
 * Forma ijarachining asosiy oqimi: ombordan buyum tanlanadi, bo'sh
 * sonidan ko'p berib bo'lmaydi, bir nechta buyum BITTA so'rovda ketadi.
 */
describe('RentalFormModal', () => {
  it("bo'sh sonidan ko'p berishga yo'l qo'ymaydi", async () => {
    show();
    await settle();

    await pickItems([['Lesa', '60']]);
    fireEvent.press(screen.getByLabelText('3 kun'));
    submit();

    expect(screen.getByText("Lesa: omborda faqat 50 tasi bo'sh")).toBeTruthy();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('bir nechta buyum bitta buyurtma bo\'lib ketadi', async () => {
    show();
    await settle();

    await pickItems([['Lesa', '40'], ['Opalubka', '120']]);
    fireEvent.press(screen.getByLabelText('3 kun'));
    submit();

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0][0]).toEqual({
      clientId: 'c1',
      period: 'DAY',
      startDate: formatDateFromDate(new Date()),
      duration: 3,
      note: undefined,
      lines: [
        { rentalItemId: 'lesa', quantity: 40, price: 5000 },
        { rentalItemId: 'opalubka', quantity: 120, price: 3000 },
      ],
    });
  });

  it("soatlik tanlansa faqat soatlik buyumlar chiqadi va soat so'raladi", async () => {
    show();
    await settle();

    fireEvent.press(screen.getByRole('radio', { name: 'Soatlik' }));
    await settle();

    expect(screen.getByText('Berilgan soat')).toBeTruthy();

    // Tanlash oynasida ham faqat SOATLIK buyumlar: kunlik va soatlik
    // bitta ijarada aralashmaydi.
    fireEvent.press(screen.getByLabelText('Ombordan tanlash'));
    await settle();
    expect(screen.queryByLabelText('Lesa miqdor')).toBeNull();
    expect(screen.getByLabelText('Beton aralashtirgich miqdor')).toBeTruthy();
  });
});
