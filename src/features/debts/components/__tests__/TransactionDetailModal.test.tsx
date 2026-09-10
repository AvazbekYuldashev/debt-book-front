import React from 'react';
import { render } from '@testing-library/react-native';
import TransactionDetailModal from '../TransactionDetailModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import { attachCalcExpression } from '../../../../shared/lib/calcNote';
import type { MappedTransaction } from '../../model/transactionMapping';

const tx = (description: string): MappedTransaction =>
  ({
    id: 'tx-1',
    amount: 5000,
    currency: 'UZS',
    visible: true,
    createdDate: '2026-09-08T04:37:00',
    description,
    kind: 'credit',
    label: 'Haq berildi',
  }) as MappedTransaction;

const renderModal = (description: string) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <TransactionDetailModal tx={tx(description)} performerPhone="" onClose={jest.fn()} />
      </LanguageProvider>
    </AppThemeProvider>,
  );

describe('TransactionDetailModal — kalkulyator ifodasi', () => {
  it('izoh va ifodani alohida ko\'rsatadi', async () => {
    const saved = attachCalcExpression('Hejeje', '10×2+55÷99');
    const { findByText, getByText } = renderModal(saved);

    expect(await findByText('Hejeje')).toBeTruthy();
    expect(getByText('10×2+55÷99')).toBeTruthy();
  });

  // Eng muhimi: xizmat belgilari ('⟪=' … '⟫') hech qachon ekranga chiqmasin.
  it('izoh matnida xizmat belgilari qolmaydi', async () => {
    const saved = attachCalcExpression('Hejeje', '10×2');
    const { findByText, queryByText } = renderModal(saved);

    await findByText('Hejeje');
    expect(queryByText(saved)).toBeNull();
    expect(queryByText(/⟪|⟫/)).toBeNull();
  });

  it('kalkulyatorsiz yozuvda ifoda qatori chiqmaydi', async () => {
    const { findByText, queryByText } = renderModal('Oddiy izoh');

    expect(await findByText('Oddiy izoh')).toBeTruthy();
    expect(queryByText(/[×÷]/)).toBeNull();
  });

  it('izoh bo\'sh, ifoda bor bo\'lsa ikkalasi ham to\'g\'ri chiqadi', async () => {
    const saved = attachCalcExpression('', '300×4');
    const { findByText } = renderModal(saved);

    expect(await findByText('Izoh kiritilmagan')).toBeTruthy();
    expect(await findByText('300×4')).toBeTruthy();
  });
});
