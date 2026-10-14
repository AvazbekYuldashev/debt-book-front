import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ClientRentalPane from '../ClientRentalPane';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { RentalResponseDTO } from '../../types/rental';
import type { RentalItemResponseDTO } from '../../types/rentalItem';

jest.mock('../../hooks/useRentals');

import {
  useBusinessRentalItems,
  useMyRentals,
  useRentalItems,
  useRentalsWithBusiness,
} from '../../hooks/useRentals';

const SHOP = 'biz-1';

const rental = (over: Partial<RentalResponseDTO> = {}): RentalResponseDTO =>
  ({
    id: 'r1',
    clientId: 'c1',
    itemName: 'Lesa',
    quantity: 1,
    period: 'DAY',
    price: 23_333,
    currency: 'UZS',
    unit: 'DONA',
    startDate: '2026-10-15',
    dueDate: '2026-10-16',
    paidAmount: 0,
    returns: [],
    approval: 'CONFIRMED',
    owner: false,
    ...over,
  }) as unknown as RentalResponseDTO;

const item = (over: Partial<RentalItemResponseDTO> = {}): RentalItemResponseDTO => ({
  id: 'i1',
  name: 'Opalubka',
  period: 'DAY',
  price: 3000,
  currency: 'UZS',
  unit: 'DONA',
  totalQuantity: 4,
  busyQuantity: 0,
  ...over,
});

const empty = { data: undefined, isLoading: false };
const giveOut = jest.fn();
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

const show = async () => {
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <ClientRentalPane
          clientId="c1"
          active
          allowWrite={false}
          onGiveOut={jest.fn()}
          onOpenRental={jest.fn()}
          ownerBusinessId={SHOP}
        />
      </LanguageProvider>
    </AppThemeProvider>,
  );
  await settle();
};

beforeEach(() => {
  (useMyRentals as jest.Mock).mockReturnValue(empty);
  (useRentalItems as jest.Mock).mockReturnValue(empty);
  (useRentalsWithBusiness as jest.Mock).mockReturnValue({ data: [rental()], isLoading: false });
  (useBusinessRentalItems as jest.Mock).mockReturnValue({ data: [item()], isLoading: false });
});

/**
 * Mijoz kartasidagi ijara sahifasi IKKIGA bo'lingan.
 *
 * Ilgari "mendagi buyumlar" va ombor bitta uzun ro'yxatda, biri
 * ikkinchisining ostida turardi — ombordagi buyumni ko'rish uchun
 * hamma yozuvdan o'tib tushish kerak edi.
 */
describe('mijoz kartasidagi ijara — ikki sahifa', () => {
  it('ikkala sahifaning nomi tepada turadi', async () => {
    await show();

    // Tugmalar ayni paytda "qayerdaman / yana nima bor" ko'rsatkichi.
    expect(screen.getAllByText('Mendagi buyumlar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ularning ombori').length).toBeGreaterThan(0);
  });

  it('birinchi sahifada MENDAGI buyumlar turadi', async () => {
    await show();

    expect(screen.getByText('Lesa')).toBeTruthy();
  });

  it('ikkinchi sahifada OMBOR turadi', async () => {
    await show();

    expect(screen.getByText('Opalubka')).toBeTruthy();
  });

  it("ombor sahifasiga bosib o'tish mumkin — web'da surib bo'lmaydi", async () => {
    await show();

    const tab = screen.getAllByLabelText('Ularning ombori')[0];
    fireEvent.press(tab);
    await settle();

    expect(screen.getByText('Opalubka')).toBeTruthy();
  });

  it("mijozga 'Ijaraga berish' chiqmaydi — ombor uniki emas", async () => {
    (useBusinessRentalItems as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    await show();

    expect(screen.queryByText('Ijaraga berish')).toBeNull();
  });
});

/**
 * "IJARAGA BERISH" TUGMASI BUYUMLAR sahifasida, omborda emas.
 *
 * Ombor bu yerda ma'lumotnoma ("menda nima bor, nechtasi bo'sh"), amal
 * esa shu odamga tegishli. Tugma ombor sarlavhasida turganda "qaysi
 * buyumga bosyapman" degan savol tug'ilardi — holbuki u bo'sh forma
 * ochadi.
 */
describe("ombor egasi tomonida 'Ijaraga berish'", () => {
  const showOwner = async () => {
    render(
      <AppThemeProvider>
        <LanguageProvider>
          <ClientRentalPane
            clientId="c1"
            active
            allowWrite
            onGiveOut={giveOut}
            onOpenRental={jest.fn()}
          />
        </LanguageProvider>
      </AppThemeProvider>,
    );
    await settle();
  };

  beforeEach(() => {
    giveOut.mockReset();
    (useMyRentals as jest.Mock).mockReturnValue({
      data: { content: [rental({ owner: true })] },
      isLoading: false,
    });
    (useRentalItems as jest.Mock).mockReturnValue({ data: [item()], isLoading: false });
  });

  it('tugma BUYUMLAR sahifasida turadi', async () => {
    await showOwner();

    fireEvent.press(screen.getByText('Ijaraga berish'));

    // Bo'sh forma ochiladi: bir mijozga bir nechta buyum beriladi.
    expect(giveOut).toHaveBeenCalledWith(null);
  });
  it('tugma BITTA joyda — ombor sarlavhalarida takrorlanmaydi', async () => {
    await showOwner();

    // Ikkala sahifa ham bir vaqtda chiziladi (gorizontal ro'yxat), shuning
    // uchun "ko'rinmaydi" deb emas, SONI bilan tekshiriladi: ombor
    // sarlavhasiga qaytib qo'shilsa ikkita bo'lib qolardi.
    expect(screen.getAllByText('Ijaraga berish')).toHaveLength(1);
    // Ombor sahifasi o'zi joyida: kategoriya qatori chiziladi.
    expect(screen.getByText('Opalubka')).toBeTruthy();
  });
});
