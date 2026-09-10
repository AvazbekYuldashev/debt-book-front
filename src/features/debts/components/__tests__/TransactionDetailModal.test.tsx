import React from 'react';
import { render } from '@testing-library/react-native';
import TransactionDetailModal from '../TransactionDetailModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { MappedTransaction } from '../../model/transactionMapping';

/** Eski (izoh ichiga yozilgan) ko'rinish — bazada shunday yozuvlar qolgan. */
const legacy = (note: string, expression: string) => `${note}\n⟪=${expression}⟫`;

const tx = (description: string, calcNote?: string): MappedTransaction =>
  ({
    id: 'tx-1',
    amount: 5000,
    currency: 'UZS',
    visible: true,
    createdDate: '2026-09-08T04:37:00',
    description,
    calcNote,
    kind: 'credit',
    label: 'Haq berildi',
  }) as MappedTransaction;

const renderModal = (description: string, calcNote?: string) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <TransactionDetailModal
          tx={tx(description, calcNote)}
          performerPhone=""
          onClose={jest.fn()}
        />
      </LanguageProvider>
    </AppThemeProvider>,
  );

describe('TransactionDetailModal — kalkulyator ifodasi', () => {
  // Asosiy yo'l: ifoda ALOHIDA ustundan keladi, izoh toza.
  it("izoh va ifodani alohida ko'rsatadi", async () => {
    const { findByText, getByText } = renderModal('Hejeje', '10×2+55÷99');

    expect(await findByText('Hejeje')).toBeTruthy();
    expect(getByText('10×2+55÷99')).toBeTruthy();
  });

  // `calc_note` ustuni paydo bo'lishidan oldin yaratilgan yozuvlar bazada
  // qolgan: ular ham to'g'ri ko'rinishi va xizmat belgilarini ekranga
  // chiqarmasligi kerak.
  it("eski yozuvni ham xizmat belgilarisiz ko'rsatadi", async () => {
    const saved = legacy('Hejeje', '10×2');
    const { findByText, getByText, queryByText } = renderModal(saved);

    expect(await findByText('Hejeje')).toBeTruthy();
    expect(getByText('10×2')).toBeTruthy();
    expect(queryByText(saved)).toBeNull();
    expect(queryByText(/⟪|⟫/)).toBeNull();
  });

  it('kalkulyatorsiz yozuvda ifoda qatori chiqmaydi', async () => {
    const { findByText, queryByText } = renderModal('Oddiy izoh');

    expect(await findByText('Oddiy izoh')).toBeTruthy();
    expect(queryByText(/[×÷]/)).toBeNull();
  });

  it("izoh bo'sh, ifoda bor bo'lsa ikkalasi ham to'g'ri chiqadi", async () => {
    const { findByText } = renderModal('', '300×4');

    expect(await findByText('Izoh kiritilmagan')).toBeTruthy();
    expect(await findByText('300×4')).toBeTruthy();
  });
});
