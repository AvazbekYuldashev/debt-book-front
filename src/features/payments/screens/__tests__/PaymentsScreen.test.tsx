import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import PaymentsScreen from '../PaymentsScreen';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';

jest.mock('../../api/usage');
jest.mock('../../api/payments');

import { fetchVoiceUsage, fetchVoiceUsageSummary } from '../../api/usage';
import { fetchPaymentHistory, fetchPaymentSummary } from '../../api/payments';

const mockUsage = fetchVoiceUsage as jest.Mock;
const mockUsageSummary = fetchVoiceUsageSummary as jest.Mock;
const mockPayments = fetchPaymentHistory as jest.Mock;
const mockBalance = fetchPaymentSummary as jest.Mock;

/**
 * Ekranda IKKI YON SAHIFA bo'lishi kerak: ovozga sarf va Click orqali
 * to'ldirish. Ular avval bitta oqimda, keyin bir-birining tagida
 * turgan edi - o'shanda ikkinchisiga yetib borish uchun birinchisini
 * oxirigacha aylantirib o'tish kerak edi.
 */
const show = () => {
  /**
   * `getParent` ham moklanadi: strelka amalni BOSHQA bo'limda ochadi,
   * ya'ni tab navigatoriga chiqadi. Haqiqiy ilovada u doim bor.
   */
  const tabNavigate = jest.fn();
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    getParent: () => ({ navigate: tabNavigate }),
  } as any;
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <PaymentsScreen navigation={navigation} route={{ key: 'k', name: 'Payments' } as any} />
      </LanguageProvider>
    </AppThemeProvider>,
  );
  return { navigation, tabNavigate };
};

/** Provayder birinchi renderda null qaytaradi, so'ng ma'lumot keladi. */
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

beforeEach(() => {
  mockUsageSummary.mockResolvedValue({
    today: 69.3, thisMonth: 154.35, total: 300,
    ratePerMinute: 450, tokensToday: 737, tokensTotal: 2024,
  });
  mockBalance.mockResolvedValue({
    balance: 9912.93, toppedUp: 10000, spent: 87.07, clickEnabled: true,
  });
  mockUsage.mockResolvedValue({
    content: [
      {
        id: 'u1', createdDate: '2026-10-02T01:19:00', durationMs: 9000,
        cost: 69.3, ratePerMinute: 450, source: 'STT',
        promptTokens: 0, completionTokens: 0, sizeBytes: 135000, commandId: 'cmd-1',
      },
      {
        id: 'u2', createdDate: '2026-10-02T01:19:30', durationMs: 0,
        cost: 0, ratePerMinute: 0, source: 'MODEL',
        promptTokens: 690, completionTokens: 47, sizeBytes: 0, commandId: 'cmd-1',
      },
    ],
  });
  mockPayments.mockResolvedValue([
    {
      id: 'p1', createdDate: '2026-10-03T00:30:00',
      paidDate: '2026-10-03T00:31:00', amount: 10000, status: 'PAID',
    },
  ]);
});

afterEach(() => jest.clearAllMocks());

describe('PaymentsScreen', () => {
  it('ikkala yon sahifa yorligi turadi', async () => {
    show();
    await settle();

    expect(screen.getByRole('tab', { name: 'Ovozlar' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: "To'ldirish" })).toBeTruthy();
  });

  /** Balans sahifalardan tashqarida - u butun ekranning bosh raqami. */
  it('balans yuqorida, sahifadan tashqarida turadi', async () => {
    show();
    await settle();

    expect(screen.getByText("9 912,93 so'm")).toBeTruthy();
  });

  /**
   * Bitta gapirish - bitta qator, garchi ichida ikkita xizmat bo'lsa ham.
   *
   * Qatorda TOKEN SONI yo'q: "737 token" dan odamga hech narsa chiqmaydi.
   * Narx esa o'ng tomonda, tanish va tushunish qo'shilgan holda.
   */
  it('ovoz sahifasida buyruq bitta qatorda turadi', async () => {
    show();
    await settle();

    expect(screen.getByText('9 soniya')).toBeTruthy();
    expect(screen.queryByText(/token/)).toBeNull();
  });

  /**
   * Ikkala sahifa ham bir vaqtda chizilgan (yonma-yon surish shuni
   * talab qiladi), shuning uchun to'lov qatori ham darhol topiladi.
   */
  it('toldirish sahifasida tolov plus bilan turadi', async () => {
    show();
    await settle();

    expect(screen.getByText("+10 000 so'm")).toBeTruthy();
  });

  /** Yorliqqa bosish ikkinchi sahifaga olib o'tadi. */
  it('yorliqqa bosilsa ikkinchi sahifa tanlanadi', async () => {
    show();
    await settle();

    const tab = screen.getByRole('tab', { name: "To'ldirish" });
    await act(async () => { fireEvent.press(tab); });

    expect(screen.getByRole('tab', { name: "To'ldirish" }).props.accessibilityState.selected)
      .toBe(true);
  });

  /** Har sahifa o'z jamisi bilan: raqam o'zi tegishli ro'yxat ustida. */
  it('har sahifa oz jamisi bilan turadi', async () => {
    show();
    await settle();

    expect(screen.getByText('Ovozli buyruqlar sarfi')).toBeTruthy();
    expect(screen.getByText("Click orqali to'ldirish")).toBeTruthy();
  });

  it('tolov bolmasa bosh holat korsatiladi', async () => {
    mockPayments.mockResolvedValue([]);
    show();
    await settle();

    expect(screen.getByText("Hali to'ldirish bo'lmagan")).toBeTruthy();
  });

  it('ovoz bolmasa bosh holat korsatiladi', async () => {
    mockUsage.mockResolvedValue({ content: [] });
    show();
    await settle();

    expect(screen.getByText("Hali ovozli buyruq yo'q")).toBeTruthy();
  });
});
