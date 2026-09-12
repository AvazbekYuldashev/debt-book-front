import React from 'react';
import { render } from '@testing-library/react-native';
import ExpenseRow from '../ExpenseRow';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { ExpenseResponseDTO } from '../../types/expense';

const expense = (overrides: Partial<ExpenseResponseDTO> = {}): ExpenseResponseDTO => ({
  id: 'e-1',
  amount: 2000,
  description: 'Non',
  categoryId: 'c-1',
  createdDate: '2026-09-12T10:00:00',
  ...overrides,
});

const renderRow = (item: ExpenseResponseDTO) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <ExpenseRow expense={item} allowDelete={false} deleting={false} onDelete={jest.fn()} />
      </LanguageProvider>
    </AppThemeProvider>,
  );

describe('ExpenseRow — kalkulyator ifodasi', () => {
  it("izoh va ifodani alohida ko'rsatadi", async () => {
    const { findByText, getByText } = renderRow(expense({ calcNote: '500×4' }));

    expect(await findByText('Non')).toBeTruthy();
    expect(getByText('500×4')).toBeTruthy();
  });

  it('kalkulyatorsiz yozuvda ifoda qatori chiqmaydi', async () => {
    const { findByText, queryByText } = renderRow(expense());

    expect(await findByText('Non')).toBeTruthy();
    expect(queryByText(/[×÷]/)).toBeNull();
  });

  it("izoh bo'sh bo'lsa ham ifoda ko'rinadi", async () => {
    const { findByText } = renderRow(expense({ description: '', calcNote: '300+200' }));

    expect(await findByText("Izoh yo'q")).toBeTruthy();
    expect(await findByText('300+200')).toBeTruthy();
  });
});
