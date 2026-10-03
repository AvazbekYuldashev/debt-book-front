import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
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
 * Ekranda IKKI ALOHIDA tarix bo'lishi kerak: ovozga sarflangan pul va
 * Click orqali to'langan pul. Ular bir paytlar bitta oqimda edi -
 * o'shanda ikkala savolga javob topish qiyin edi.
 */
const show = () => {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <PaymentsScreen navigation={navigation} route={{ key: 'k', name: 'Payments' } as any} />
      </LanguageProvider>
    </AppThemeProvider>,
  );
  return { navigation };
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
  it('ikkala bolim sarlavhasi turadi', async () => {
    show();
    await settle();

    expect(screen.getByText('Ovozlar tarixi')).toBeTruthy();
    expect(screen.getByText("To'lovlar tarixi")).toBeTruthy();
  });

  /** Bitta gapirish - bitta qator, garchi ichida ikkita xizmat bo'lsa ham. */
  it('ovoz bolimida buyruq bitta qatorda turadi', async () => {
    show();
    await settle();

    expect(screen.getByText('9 soniya · Gapni tushunish - 737 token')).toBeTruthy();
  });

  /** To'ldirish "+" bilan: balansga tushgani darhol ko'rinishi kerak. */
  it('tolovlar bolimida toldirish plus bilan turadi', async () => {
    show();
    await settle();

    expect(screen.getByText("+10 000 so'm")).toBeTruthy();
  });

  /**
   * Bo'sh bo'lim YO'QOLMAYDI - sarlavhasi va izohi qoladi. G'oyib
   * bo'lgan bo'lim "umuman yo'q" degan taassurot qoldirardi.
   */
  it('tolov bolmasa ham bolim izoh bilan qoladi', async () => {
    mockPayments.mockResolvedValue([]);
    show();
    await settle();

    expect(screen.getByText("To'lovlar tarixi")).toBeTruthy();
    expect(screen.getByText("Hali to'ldirish bo'lmagan")).toBeTruthy();
  });

  it('ovoz bolmasa ham bolim izoh bilan qoladi', async () => {
    mockUsage.mockResolvedValue({ content: [] });
    show();
    await settle();

    expect(screen.getByText('Ovozlar tarixi')).toBeTruthy();
    expect(screen.getByText("Hali ovozli buyruq yo'q")).toBeTruthy();
  });
});
