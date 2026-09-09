import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import GapTransferDetailModal from '../GapTransferDetailModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { GapTransferDTO } from '../../types/gap';

const transfer = (overrides: Partial<GapTransferDTO> = {}): GapTransferDTO => ({
  transferId: 't-1',
  counterpartyMemberId: 'm-1',
  counterpartyName: 'Vevehe',
  counterpartyPhone: '998901413656',
  counterpartyMe: false,
  amount: 5161,
  unitCode: 'UZS',
  unitLabel: "so'm",
  unitType: 'MONEY',
  note: 'qarz',
  date: '2026-09-08',
  confirmed: false,
  status: 'WAITING',
  canConfirm: false,
  ...overrides,
});

const renderModal = (props: Partial<React.ComponentProps<typeof GapTransferDetailModal>> = {}) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <GapTransferDetailModal
          transfer={transfer()}
          direction="out"
          onConfirm={jest.fn()}
          onClose={jest.fn()}
          {...props}
        />
      </LanguageProvider>
    </AppThemeProvider>,
  );

describe('GapTransferDetailModal', () => {
  it('yozuvning to\'liq tafsilotini ko\'rsatadi', async () => {
    const { findByText, getByText } = renderModal();

    expect(await findByText('Oldi-berdi tafsiloti')).toBeTruthy();
    // Miqdor yozuvning O'Z birligida, aylantirilmasdan.
    expect(getByText("5 161 so'm")).toBeTruthy();
    expect(getByText('08.09.2026')).toBeTruthy();
    expect(getByText('Vevehe')).toBeTruthy();
    expect(getByText('qarz')).toBeTruthy();
    expect(getByText('Kutilmoqda')).toBeTruthy();
  });

  it('yo\'nalishga qarab "Berdim" yoki "Oldim" deb ataydi', async () => {
    const given = renderModal({ direction: 'out' });
    expect(await given.findByText('Berdim')).toBeTruthy();

    const taken = renderModal({ direction: 'in' });
    expect(await taken.findByText('Oldim')).toBeTruthy();
  });

  it('izoh bo\'lmasa o\'rniga tushuntirish qo\'yadi', async () => {
    const { findByText } = renderModal({ transfer: transfer({ note: '   ' }) });
    expect(await findByText('Izoh kiritilmagan')).toBeTruthy();
  });

  // Tasdiq tugmasi faqat qarama-qarshi tomonda: o'zim kiritgan yozuvni
  // o'zim tasdiqlay olmayman.
  it('tasdiqlash tugmasini faqat canConfirm bo\'lganda chiqaradi', async () => {
    const off = renderModal();
    await off.findByText('Oldi-berdi tafsiloti');
    expect(off.queryByText('Tasdiqlash')).toBeNull();

    const on = renderModal({ transfer: transfer({ canConfirm: true }) });
    expect(await on.findByText('Tasdiqlash')).toBeTruthy();
  });

  it('tasdiqlash tugmasi bosilganda yozuvni qaytaradi', async () => {
    const onConfirm = jest.fn();
    const item = transfer({ canConfirm: true });
    const { findByText } = renderModal({ transfer: item, onConfirm });

    fireEvent.press(await findByText('Tasdiqlash'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(item));
  });
});
