import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import RentalListScreen from '../RentalListScreen';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import { AuthContext } from '../../../auth/context/AuthContext';
import { formatDateFromDate } from '../../../../shared/lib/date';
import type { RentalResponseDTO } from '../../types/rental';
import type { RentalItemResponseDTO } from '../../types/rentalItem';

/**
 * Yuqori qator (ish maydoni almashtirgichi va bildirishnoma) navigatsiya
 * obyektini talab qiladi. Bu test RO'YXAT haqida, shuning uchun umumiy
 * sarlavha o'rniga bo'shliq qo'yiladi — u o'z joyida sinaladi.
 */
jest.mock('../../../../app/components/ScreenTopBar', () => () => null);

jest.mock('../../hooks/useRentals');

/**
 * Kategoriyalar hook orqali emas, xizmat orqali keladi (narxnomadagi
 * mexanizmning o'zi), shuning uchun alohida moklanadi.
 */
jest.mock('../../../expenses/services/categoryService', () => ({
  getCategories: jest.fn(async () => ({
    content: [
      { id: 'cat-qurilish', name: 'Qurilish' },
      { id: 'cat-toy', name: "To'y" },
    ],
  })),
  createCategory: jest.fn(),
  deleteCategory: jest.fn(),
}));

import {
  useCreateRentalBatch,
  useCreateRentalItem,
  useDeleteRental,
  useDeleteRentalItem,
  useMyRentals,
  usePayRental,
  useRentalItems,
  useRentalSummary,
  useReturnRental,
  useUpdateRental,
  useUpdateRentalItem,
} from '../../hooks/useRentals';

const mockList = useMyRentals as jest.Mock;
const mockSummary = useRentalSummary as jest.Mock;
const mockItems = useRentalItems as jest.Mock;

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
  period: 'DAY',
  price: 50000,
  currency: 'UZS',
  startDate: dayShift(-5),
  dueDate: dayShift(-2),
  returnedDate: null,
  paidAmount: 0,
  ...over,
});

const stockItem = (over: Partial<RentalItemResponseDTO>): RentalItemResponseDTO => ({
  id: 'i1',
  name: 'Lesa',
  period: 'DAY',
  price: 5000,
  currency: 'UZS',
  unit: 'DONA',
  totalQuantity: 100,
  busyQuantity: 0,
  ...over,
});

const listResult = (content: RentalResponseDTO[]) => ({
  data: { content },
  isLoading: false,
  isRefetching: false,
  error: null,
  refetch: jest.fn(),
});

/**
 * `tab` berilmasa ekran OMBOR bilan ochiladi. Ijaralar testlari
 * to'g'ridan-to'g'ri o'sha bo'limni ochadi — chipni bosib o'tish har
 * testda bir xil takror bo'lardi.
 */
const show = (tab?: 'stock' | 'rentals') => {
  const navigation = { goBack: jest.fn(), navigate: jest.fn(), setParams: jest.fn() } as never;
  const route = { key: 'Rentals', name: 'Rentals', params: tab ? { tab } : undefined } as never;
  return render(
    <AppThemeProvider>
      <LanguageProvider>
        {/* Kategoriyalar xizmat orqali, token bilan yuklanadi. */}
        <AuthContext.Provider value={{ profile: { jwt: 'test-jwt' } } as never}>
        <RentalListScreen navigation={navigation} route={route} />
        </AuthContext.Provider>
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
  for (const hook of [
    useCreateRentalBatch,
    useUpdateRental,
    useReturnRental,
    usePayRental,
    useDeleteRental,
    useCreateRentalItem,
    useUpdateRentalItem,
    useDeleteRentalItem,
  ]) {
    (hook as jest.Mock).mockReturnValue(mutationStub);
  }
  mockSummary.mockReturnValue({ data: undefined, isLoading: false, refetch: jest.fn() });
  mockList.mockReturnValue(listResult([]));
  mockItems.mockReturnValue({
    data: [],
    isLoading: false,
    isRefetching: false,
    error: null,
    refetch: jest.fn(),
  });
});

describe('RentalListScreen — ombor', () => {
  it("ombor bo'sh bo'lsa buyum qo'shishga undaydi", async () => {
    show();
    await settle();
    expect(screen.getByText("Ombor bo'sh")).toBeTruthy();
  });

  it("100 tadan 50 tasi band bo'lsa 50 tasi bo'sh ko'rinadi", async () => {
    mockItems.mockReturnValue({
      data: [stockItem({ busyQuantity: 50 })],
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: jest.fn(),
    });
    show();
    await settle();

    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.getByText('Band 50 · jami 100 dona')).toBeTruthy();
  });

  it('hammasi band bo\'lsa shunday deb yoziladi', async () => {
    mockItems.mockReturnValue({
      data: [stockItem({ busyQuantity: 100 })],
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: jest.fn(),
    });
    show();
    await settle();

    expect(screen.getByText('hammasi band')).toBeTruthy();
  });

  it('guruhlar sarlavha bilan ajraladi', async () => {
    mockItems.mockReturnValue({
      data: [
        stockItem({ id: 'a', name: 'Opalubka', category: 'Qurilish', unit: 'METR_KVADRAT' }),
        stockItem({ id: 'b', name: 'Stul', category: "To'y" }),
      ],
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: jest.fn(),
    });
    show();
    await settle();

    // Nom ikki joyda chiqadi: kategoriya panelidagi chip va guruh
    // sarlavhasi — shuning uchun `getAllByText`.
    expect(screen.getAllByText('Qurilish').length).toBeGreaterThan(0);
    expect(screen.getAllByText("To'y").length).toBeGreaterThan(0);
  });

  /**
   * KATEGORIYA FILTRI.
   *
   * Kategoriyalar narxnomadagi kabi boshqariladigan ro'yxatdan keladi va
   * filtr NOM bo'yicha emas, `categoryId` bo'yicha ishlaydi: nom qayta
   * yozilganda ham guruh buzilmasligi kerak.
   */
  it('kategoriya tanlanganda faqat o\'sha guruh qoladi', async () => {
    mockItems.mockReturnValue({
      data: [
        stockItem({ id: 'a', name: 'Opalubka', category: 'Qurilish', categoryId: 'cat-qurilish' }),
        stockItem({ id: 'b', name: 'Stul', category: "To'y", categoryId: 'cat-toy' }),
      ],
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: jest.fn(),
    });
    show();
    await settle();

    // Boshida ikkalasi ham ko'rinadi.
    expect(screen.getByText('Opalubka')).toBeTruthy();
    expect(screen.getByText('Stul')).toBeTruthy();

    // Paneldagi "Qurilish" chipi bosiladi (guruh sarlavhasi emas).
    const chips = screen.getAllByText('Qurilish');
    fireEvent.press(chips[0]);
    await settle();

    expect(screen.getByText('Opalubka')).toBeTruthy();
    expect(screen.queryByText('Stul')).toBeNull();
  });
});

describe('RentalListScreen — ijaralar', () => {
  it("ro'yxat bo'sh bo'lsa nima qilish kerakligini aytadi", async () => {
    show('rentals');
    await settle();
    expect(screen.getByText("Hozircha ijara yo'q")).toBeTruthy();
  });

  it('bo\'lim chipi bosilganda ijaralar ochiladi', async () => {
    show();
    await settle();
    fireEvent.press(screen.getByText('Ijaralar'));
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
    show('rentals');
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
    show('rentals');
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
    show('rentals');
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
    show('rentals');
    await settle();

    // 5 kun × 50 000 = 250 000, 100 000 olingan -> 150 000 qoldi.
    expect(screen.getByText(/150 000/)).toBeTruthy();
  });

  /**
   * NASIYA butunlay olib tashlandi — bosqich ham, filtr ham, panel
   * ustuni ham. Izohi `rentalMath.rentalStage` da: u `paidAmount` ga
   * tayanardi, ilovada esa ijara to'lovini yozadigan yo'l qolmagan.
   */
  it("qaytgan ijara NASIYA emas, QAYTARILDI bo'lib turadi", async () => {
    mockList.mockReturnValue(
      listResult([rental({ returnedDate: dayShift(-1), paidAmount: 50000 })]),
    );
    show('rentals');
    await settle();

    expect(screen.queryByText('Nasiya')).toBeNull();
    expect(screen.getAllByText('Qaytarildi').length).toBeGreaterThan(0);
    // Pul qatorda QOLADI: 4 kun × 50 000 = 200 000, 50 000 olingan -> 150 000.
    expect(screen.getByText(/150 000/)).toBeTruthy();
  });

  it('Nasiya filtri umuman chiqmaydi', async () => {
    mockList.mockReturnValue(
      listResult([rental({ id: 'r-out', itemName: 'Lesa' })]),
    );
    show('rentals');
    await settle();

    expect(screen.queryByRole('radio', { name: 'Nasiya' })).toBeNull();
    // Qolgan filtrlar joyida.
    expect(screen.getByRole('radio', { name: 'Kechikkan' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Yopilgan' })).toBeTruthy();
  });

  it('soatlik ijarada soatlar ko\'rinadi', async () => {
    const now = new Date();
    const pad = (v: number) => String(v).padStart(2, '0');
    const start = new Date(now.getTime() - 3 * 60 * 60 * 1000 - 10 * 60 * 1000);
    mockList.mockReturnValue(
      listResult([
        rental({
          itemName: 'Generator',
          period: 'HOUR',
          price: 20000,
          startDate: formatDateFromDate(start),
          startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
          dueDate: formatDateFromDate(start),
          dueTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        }),
      ]),
    );
    show('rentals');
    await settle();

    // 3 soat 10 daqiqa — boshlangan soat to'liq: 4 soat.
    expect(screen.getByText('4 soat')).toBeTruthy();
  });
});