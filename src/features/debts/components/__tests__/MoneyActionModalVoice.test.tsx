import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import { WorkspaceProvider } from '../../../business/context/WorkspaceContext';
import { CurrencyProvider } from '../../context/CurrencyContext';
import MoneyActionModal from '../MoneyActionModal';
import type { VoiceIntent } from '../../../voice/api/voice';

/**
 * Ovozdan kelgan natija FORMAGA qanday tushishi.
 *
 * Sof funksiya (`applyTransactionIntent`) sinalgan edi, lekin komponentdagi
 * ulanish sinalmagandi — va xarid qatorlari aynan o'sha joyda yo'qoldi:
 * summa to'lardi, savat esa bo'sh qolardi va chek saqlanmasdi.
 */

/** VoiceBar o'rniga soxta komponent: uning `onResult` propini ushlab qolamiz. */
let emit: ((intent: VoiceIntent) => void) | null = null;
/** Savat oynasiga uzatilgan boshlang'ich qatorlar. */
let basketProps: { initialItems?: { productId: string; quantity: number }[] } | null = null;

jest.mock('../../../products/components/ProductBasketModal', () => {
  const React3 = require('react');
  return {
    __esModule: true,
    default: (props: { initialItems?: { productId: string; quantity: number }[] }) => {
      basketProps = props;
      return React3.createElement('View', null);
    },
  };
});

jest.mock('../../../voice/components/VoiceBar', () => {
  const React2 = require('react');
  return {
    __esModule: true,
    default: (props: { onResult: (i: VoiceIntent) => void }) => {
      emit = props.onResult;
      return React2.createElement('View', null);
    },
  };
});

const renderModal = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <AppThemeProvider>
      <LanguageProvider>
        <WorkspaceProvider>
          <CurrencyProvider>
            <MoneyActionModal
              visible
              actionType="TAKE"
              ownerAccountType="personal"
              fixedCounterpartyId="biz-1"
              fixedCounterpartyType="BUSINESS_ACCOUNT"
              onClose={jest.fn()}
              onSubmit={jest.fn()}
            />
          </CurrencyProvider>
        </WorkspaceProvider>
      </LanguageProvider>
    </AppThemeProvider>
    </QueryClientProvider>,
  );

const settle = () =>
  act(async () => {
    await Promise.resolve();
  });

/** "salol marketdan to'rtta bir litrlik fanta oldim" ga backend javobi. */
const purchase: VoiceIntent = {
  text: "salol marketdan to'rtta bir litrlik fanta oldim",
  understood: false,
  amount: 28000,
  currency: 'UZS',
  direction: 'TOOK',
  calcNote: '7000×4',
  items: [{ productId: 'prod-1', name: 'Fanta', quantity: 4, price: 7000 }],
};

describe('MoneyActionModal — ovozli xarid', () => {
  beforeEach(() => {
    emit = null;
    basketProps = null;
  });

  it('xarid qatorlari savatga tushadi', async () => {
    renderModal();
    await settle();

    expect(emit).not.toBeNull();
    await act(async () => {
      emit!(purchase);
    });

    // Bo'sh holatda tugmada "Narxnomadan tanlash" yozuvi turadi — qatorlar
    // qo'yilgan bo'lsa u sonni ko'rsatishi kerak.
    expect(screen.queryByText('Narxnomadan tanlash')).toBeNull();
    expect(screen.getByText(/1 ta mahsulot tanlandi/)).toBeTruthy();
  });

  it('summa va valyuta ham to\'ladi', async () => {
    renderModal();
    await settle();

    await act(async () => {
      emit!(purchase);
    });

    expect(screen.getByDisplayValue('28 000')).toBeTruthy();
  });

  /**
   * Savat oynasi FORMADAGI holat bilan ochilishi kerak. Ilgari u noldan
   * ochilardi: ovoz bilan 4 ta Fanta tanlangandan keyin uni 3 ta qilmoqchi
   * bo'lgan odam avvalgi tanlovni yo'qotardi.
   */
  it('savat oynasi hozirgi qatorlarni oladi', async () => {
    renderModal();
    await settle();

    await act(async () => {
      emit!(purchase);
    });

    expect(basketProps?.initialItems).toEqual([{ productId: 'prod-1', quantity: 4 }]);
  });

  /** Qatorsiz oddiy gapda savat bo'sh qoladi. */
  it('oddiy qarz gapida savat tegilmaydi', async () => {
    renderModal();
    await settle();

    await act(async () => {
      emit!({ text: 'nonga', understood: true, amount: 50000 });
    });

    expect(screen.getByText('Narxnomadan tanlash')).toBeTruthy();
  });
});
