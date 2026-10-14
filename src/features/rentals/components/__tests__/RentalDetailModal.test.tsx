import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import RentalDetailModal from '../RentalDetailModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { RentalResponseDTO } from '../../types/rental';

jest.mock('../../hooks/useRentals');

import {
  useConfirmRental,
  useDeleteRental,
  usePayRental,
  useRequestRentalPayment,
  useResolveRentalPayment,
  useReturnRental,
} from '../../hooks/useRentals';

const ownerPay = jest.fn();
const clientPay = jest.fn();
const resolvePay = jest.fn();

const rental = (over: Partial<RentalResponseDTO> = {}): RentalResponseDTO =>
  ({
    id: 'r1',
    clientId: 'c1',
    clientName: 'Akmal Tursunov',
    itemName: 'Lesa',
    quantity: 10,
    period: 'DAY',
    price: 5000,
    currency: 'UZS',
    unit: 'DONA',
    startDate: '2026-10-10',
    dueDate: '2026-10-20',
    paidAmount: 0,
    returns: [],
    approval: 'CONFIRMED',
    owner: true,
    unpaid: 200_000,
    ...over,
  }) as unknown as RentalResponseDTO;

const show = (item: RentalResponseDTO) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <RentalDetailModal rental={item} onClose={jest.fn()} onEdit={jest.fn()} />
      </LanguageProvider>
    </AppThemeProvider>,
  );

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

const idle = { mutate: jest.fn(), isPending: false };

beforeEach(() => {
  ownerPay.mockReset();
  clientPay.mockReset();
  resolvePay.mockReset();
  (usePayRental as jest.Mock).mockReturnValue({ mutate: ownerPay, isPending: false });
  (useRequestRentalPayment as jest.Mock).mockReturnValue({ mutate: clientPay, isPending: false });
  (useResolveRentalPayment as jest.Mock).mockReturnValue({ mutate: resolvePay, isPending: false });
  (useReturnRental as jest.Mock).mockReturnValue(idle);
  (useConfirmRental as jest.Mock).mockReturnValue(idle);
  (useDeleteRental as jest.Mock).mockReturnValue(idle);
});

/**
 * TO'LOV YO'LI yozuv kimning ekaniga qarab boshqa.
 *
 * Egasi o'z daftarida pul olganini darhol yozadi. Mijoz esa "pul berdim"
 * deb yozadi va summa egasi tasdiqlagunicha hisobga kirmaydi — aks holda
 * u o'z qarzini o'zi yopib qo'ya olardi.
 *
 * Ilgari mijozga egasining tugmasi ko'rinib, bosilganda server 403
 * qaytarardi. Shu test o'sha xatoni qaytib kelishiga yo'l qo'ymaydi.
 */
describe('to\'lov yo\'li', () => {
  it("egasiga 'Pul oldim' chiqadi va u darhol yoziladi", async () => {
    show(rental());
    await settle();

    fireEvent.press(screen.getByText('Pul oldim'));
    fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], '50000');
    const buttons = screen.getAllByText('Pul oldim');
    fireEvent.press(buttons[buttons.length - 1]);

    expect(ownerPay).toHaveBeenCalledTimes(1);
    expect(clientPay).not.toHaveBeenCalled();
  });

  it("mijozga 'Pul berdim' chiqadi va u TASDIQ so'rovi bo'lib ketadi", async () => {
    show(rental({ owner: false, canPay: true }));
    await settle();

    fireEvent.press(screen.getByText('Pul berdim'));
    fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], '50000');
    const buttons = screen.getAllByText('Pul berdim');
    fireEvent.press(buttons[buttons.length - 1]);

    // Egasining yo'li EMAS: u 403 qaytarardi.
    expect(clientPay).toHaveBeenCalledTimes(1);
    expect(ownerPay).not.toHaveBeenCalled();
  });

  it('mijoz tomonida egasining amallari ko\'rinmaydi', async () => {
    show(rental({ owner: false, canPay: true }));
    await settle();

    expect(screen.queryByText('Pul oldim')).toBeNull();
    expect(screen.queryByText('Buyum qaytdi')).toBeNull();
  });

  it("mijoz o'z to'lovini kutayotganini ko'radi", async () => {
    show(rental({ owner: false, pendingPayment: 50_000 }));
    await settle();

    expect(screen.getByText('To\'lov tasdiq kutyapti')).toBeTruthy();
    // Kutayotgan to'lov bor — ikkinchisini yozib bo'lmaydi.
    expect(screen.queryByText('Pul berdim')).toBeNull();
  });

  it('egasi mijozning to\'lovini tasdiqlaydi', async () => {
    show(rental({ pendingPayment: 50_000, canConfirmPayment: true }));
    await settle();

    expect(screen.getByText('Mijoz to\'lov yozdi')).toBeTruthy();
    fireEvent.press(screen.getByText('Tasdiqlash'));

    expect(resolvePay).toHaveBeenCalledWith(
      { id: 'r1', accept: true },
      expect.anything(),
    );
  });

  it('egasi rad eta oladi — yolg\'on yozuv osilib qolmaydi', async () => {
    show(rental({ pendingPayment: 50_000, canConfirmPayment: true }));
    await settle();

    fireEvent.press(screen.getByText('Rad etish'));

    expect(resolvePay).toHaveBeenCalledWith(
      { id: 'r1', accept: false },
      expect.anything(),
    );
  });
});
