import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import RentalRow from '../RentalRow';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { RentalResponseDTO } from '../../types/rental';

const rental = (over: Partial<RentalResponseDTO> = {}): RentalResponseDTO =>
  ({
    id: 'r1',
    clientId: 'c1',
    clientName: 'Akmal Tursunov',
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
    owner: true,
    ...over,
  }) as unknown as RentalResponseDTO;

// AppThemeProvider birinchi renderda bo'sh qaytaradi (shrift/tema
// yuklanmoqda) — shuning uchun tekshirishdan oldin kutiladi.
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

const show = async (item: RentalResponseDTO) => {
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <RentalRow item={item} showClient={false} />
      </LanguageProvider>
    </AppThemeProvider>,
  );
  await settle();
};

/**
 * Qatordagi O'NG USTUN.
 *
 * Ilgari u ikki raqam ko'rsatardi — yig'ilgan va qoldiq — va hech narsa
 * to'lanmagan ijarada ular bir xil bo'lib, bitta son ikki marta
 * yozilgandek ko'rinardi. So'z esa har doim egasining tilida edi
 * ("olinmagan"), mijoz uchun esa bu "kim olmagan?" degan savol.
 */
describe('ijara qatori — qoldiq ustuni', () => {
  it("bitta raqam ko'rsatadi, takrorlamaydi", async () => {
    await show(rental());

    // Hech narsa to'lanmagan: yig'ilgan ham, qoldiq ham 23 333.
    expect(screen.getAllByText("23 333 so'm")).toHaveLength(1);
  });

  it("ombor egasiga 'Olinmagan' deydi", async () => {
    await show(rental());

    expect(screen.getByText('Olinmagan')).toBeTruthy();
    expect(screen.queryByText("To'lashim kerak")).toBeNull();
  });

  it("mijozga 'To'lashim kerak' deydi", async () => {
    await show(rental({ owner: false }));

    expect(screen.getByText("To'lashim kerak")).toBeTruthy();
    expect(screen.queryByText('Olinmagan')).toBeNull();
  });

  it("to'liq to'langan ijarada qoldiq emas, jami turadi", async () => {
    await show(rental({ paidAmount: 23_333 }));

    expect(screen.getByText('Hisob toza')).toBeTruthy();
    expect(screen.getByText("23 333 so'm")).toBeTruthy();
  });

  it("qisman to'langanda QOLDIQ ko'rsatiladi, yig'ilgan emas", async () => {
    await show(rental({ paidAmount: 10_000 }));

    expect(screen.getByText("13 333 so'm")).toBeTruthy();
    expect(screen.queryByText("23 333 so'm")).toBeNull();
  });

  it("ortiqcha to'lov alohida so'z bilan chiqadi", async () => {
    await show(rental({ paidAmount: 30_000 }));

    expect(screen.getByText("Ortiqcha to'lov")).toBeTruthy();
    expect(screen.getByText("6 667 so'm")).toBeTruthy();
  });

  it('muddatsiz ijarada sana emas, "Muddat belgilanmagan" turadi', async () => {
    await show(rental({ openEnded: true }));

    expect(screen.getByText('Muddat belgilanmagan')).toBeTruthy();
  });
});
