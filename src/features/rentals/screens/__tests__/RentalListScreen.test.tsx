import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import RentalListScreen from '../RentalListScreen';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import { formatDateFromDate } from '../../../../shared/lib/date';
import type { RentalResponseDTO } from '../../types/rental';

jest.mock('../../hooks/useRentals');

import {
  useCreateRental,
  useDeleteRental,
  useMyRentals,
  usePayRental,
  useRentalSummary,
  useReturnRental,
  useUpdateRental,
} from '../../hooks/useRentals';

const mockList = useMyRentals as jest.Mock;
const mockSummary = useRentalSummary as jest.Mock;

/**
 * Ekran forma va karta oynalarini ham o'z ichiga oladi, ular esa yozish
 * hook'larini CHAQIRADI (ko'rinmasa ham - hook'lar shartsiz ishlaydi).
 * Shuning uchun hammasiga bo'sh mutatsiya qaytariladi.
 */
const mutationStub = { mutate: jest.fn(), isPending: false };

/**
 * Sanalar BUGUNGA NISBATAN quriladi.
 *
 * Qat'iy sana yozib bo'lmaydi: ijara hisobi "bugun"ga tayanadi va
 * qotirilgan sanalar bilan test ertaga boshqa natija berardi — bir
 * kecha o'tgach o'zi yiqiladigan test esa koddan yomonroq.
 */
const dayShift = (days: number): string => {
  const now = new Date();
  return formatDateFromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
};

const rental = (over: Partial<RentalResponseDTO>): RentalResponseDTO => ({
  id: 'r1',
  clientId: 'c1',
  clientName: 'Akmal',
  itemName: 'Perforator',
  quantity: 1,
  dailyPrice: 50000,
  currency: 'UZS',
  startDate: dayShift(-5),
  dueDate: dayShift(-2),
  returnedDate: null,
  paidAmount: 0,
  ...over,
});

const show = () => {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() } as never;
  return render(
    <AppThemeProvider>
      <LanguageProvider>
        <RentalListScreen navigation={navigation} />
      </LanguageProvider>
    </AppThemeProvider>,
  );
};

/**
 * `AppThemeProvider` birinchi renderda null qaytaradi (shrift va saqlangan
 * mavzuni kutadi), shuning uchun har bir test tekshirishdan oldin bir
 * "nafas" oladi — boshqa ekran testlari ham shunday qilingan.
 */
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

beforeEach(() => {
  (useCreateRental as jest.Mock).mockReturnValue(mutationStub);
  (useUpdateRental as jest.Mock).mockReturnValue(mutationStub);
  (useReturnRental as jest.Mock).mockReturnValue(mutationStub);
  (usePayRental as jest.Mock).mockReturnValue(mutationStub);
  (useDeleteRental as jest.Mock).mockReturnValue(mutationStub);
  mockSummary.mockReturnValue({ data: undefined, isLoading: false, refetch: jest.fn() });
  mockList.mockReturnValue({
    data: { content: [] },
    isLoading: false,
    isRefetching: false,
    error: null,
    refetch: jest.fn(),
  });
});

describe('RentalListScreen', () => {
  it("ro'yxat bo'sh bo'lsa nima qilish kerakligini aytadi", async () => {
    show();
    await settle();
    expect(screen.getByText("Hozircha ijara yo'q")).toBeTruthy();
  });

  it('kechikkan ijarada kechikkan kunlar soni ko\'rinadi', async () => {
    // 5 kun oldin berilgan, muddati 2 kun oldin tugagan, buyum qaytmagan.
    mockList.mockReturnValue({
      data: { content: [rental({})] },
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: jest.fn(),
    });
    show();
    await settle();

    expect(screen.getByText('2 kun kechikdi')).toBeTruthy();
    // Hisob TO'XTAMAYDI: muddat 3 kun edi, lekin bugungacha 5 kun.
    expect(screen.getByText('5 kun')).toBeTruthy();
  });

  it("qaytarilgan ijara qizil emas — kechikkan bo'lsa ham yopilgan deb turadi", async () => {
    mockList.mockReturnValue({
      data: { content: [rental({ returnedDate: dayShift(-1), paidAmount: 200000 })] },
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: jest.fn(),
    });
    show();
    await settle();

    expect(screen.getByText('Qaytarildi')).toBeTruthy();
    // 4 kun × 50 000 = 200 000, hammasi to'langan.
    expect(screen.getByText('Hisob toza')).toBeTruthy();
  });

  it('kechikkanlar ro\'yxat boshida turadi', async () => {
    mockList.mockReturnValue({
      data: {
        content: [
          // Qaytarilgan — oxirida turishi kerak.
          rental({ id: 'r-returned', itemName: 'Gayka kaliti', returnedDate: dayShift(-1) }),
          // Muddati hali kelmagan — o'rtada.
          rental({ id: 'r-active', itemName: 'Armatura', startDate: dayShift(-1), dueDate: dayShift(3) }),
          // Kechikkan — boshida.
          rental({ id: 'r-late', itemName: 'Beton aralashtirgich' }),
        ],
      },
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: jest.fn(),
    });
    show();
    await settle();

    // Qatorda nom va miqdor qo'shimchasi ikki bola bo'lib keladi
    // ("Stol" + " x 2"), shuning uchun ular bitta satrga yig'iladi.
    const names = screen.getAllByText(/Beton aralashtirgich|Armatura|Gayka kaliti/);
    const text = (node: ReactTestInstance) =>
      ([] as unknown[]).concat(node.props.children).join('');
    expect(names.map(text)).toEqual([
      'Beton aralashtirgich',
      'Armatura',
      'Gayka kaliti',
    ]);
  });

  it('olinmagan qoldiq alohida ko\'rsatiladi', async () => {
    mockList.mockReturnValue({
      data: { content: [rental({ paidAmount: 100000 })] },
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: jest.fn(),
    });
    show();
    await settle();

    // 5 kun × 50 000 = 250 000, 100 000 olingan -> 150 000 qoldi.
    expect(screen.getByText(/150 000/)).toBeTruthy();
  });
});
