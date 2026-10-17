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
  it("PUL bu yerda yozilmaydi — u Qarzlar bo'limida", async () => {
    /*
     * Ijara summasi "Qarz berish" bilan birga pul yozuviga kiradi.
     * Kartada ikkinchi to'lov yo'li bo'lsa pul BOSHQA daftarga
     * tushardi: odam 2 ta lesani olib, pulini to'lagandan keyin ham
     * qarz ko'rinib turardi — aynan shu xato ro'y berdi.
     */
    show(rental());
    await settle();

    expect(screen.queryByText('Pul oldim')).toBeNull();
    expect(ownerPay).not.toHaveBeenCalled();
  });

  it("karta QARZ emas, yig'ilgan HAQNI ko'rsatadi", async () => {
    /*
     * Ilgari tepada "To'lash kerak" turardi va odam pulini bergandan
     * keyin ham qizil raqamni ko'rib "hali ham qarz" deb yozardi.
     * Haq - ma'lumot; qarz esa Qarzlar bo'limida.
     */
    show(rental({ paidAmount: 0 }));
    await settle();

    expect(screen.getByText("Yig'ilgan ijara haqi")).toBeTruthy();
    expect(screen.getByText("Pul Qarzlar bo'limida yuritiladi")).toBeTruthy();
    expect(screen.queryByText("To'lash kerak")).toBeNull();
    expect(screen.queryByText("To'lanmagan")).toBeNull();
  });

  it("mijozda ham to'lov yo'li yo'q", async () => {
    show(rental({ owner: false, canPay: true }));
    await settle();

    expect(screen.queryByText('Pul berdim')).toBeNull();
    expect(clientPay).not.toHaveBeenCalled();
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
