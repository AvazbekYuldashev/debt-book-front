import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import RentalRow from '../RentalRow';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { RentalResponseDTO } from '../../types/rental';

/**
 * Sanalar BUGUNGA nisbatan.
 *
 * Qotib qolgan sana bilan test vaqt o'tishi bilan yiqilardi: ijara
 * hisobi haqiqiy soatdan yuradi, shuning uchun "2026-10-15" dan bir
 * necha kun o'tgach summa ikkilanib ketardi.
 */
const iso = (shiftDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + shiftDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
};

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
    // Bugun boshlangan, ertaga qaytariladi: hisob AYNAN bir kun.
    startDate: iso(0),
    dueDate: iso(1),
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
 * Qatordagi O'NG USTUN — ilovaning qarz lug'atida.
 *
 * HAQ (menga tegishli pul), QARZ (men to'laydigan) yoki nol. Aynan shu
 * ikki so'z kontakt sarlavhasida ham turadi, ya'ni sarlavha bilan qator
 * bitta tilda gapiradi. Ilgari qator "olinmagan" derdi — mijoz uchun bu
 * "kim olmagan?" degan savol edi.
 */
describe('ijara qatori — qoldiq ustuni', () => {
  it("bitta raqam ko'rsatadi, takrorlamaydi", async () => {
    await show(rental());

    // Hech narsa to'lanmagan: yig'ilgan ham, qoldiq ham 23 333.
    expect(screen.getAllByText("23 333 so'm")).toHaveLength(1);
  });

  it("ombor egasiga to'lanmagan ijara HAQ bo'lib ko'rinadi", async () => {
    await show(rental());

    // Pul unga tegishli — kontakt sarlavhasidagi "Hozirgi haq" bilan bir xil.
    expect(screen.getByText('Haq')).toBeTruthy();
    expect(screen.queryByText('Qarz')).toBeNull();
  });

  it("mijozga xuddi shu ijara QARZ bo'lib ko'rinadi", async () => {
    await show(rental({ owner: false }));

    expect(screen.getByText('Qarz')).toBeTruthy();
    expect(screen.queryByText('Haq')).toBeNull();
  });

  it("to'liq to'langan ijarada NOL turadi", async () => {
    await show(rental({ paidAmount: 23_333 }));

    // "Hammasi to'landi" degani aynan nol; boshqa raqam yana nimadir
    // qolgandek o'qilardi.
    expect(screen.getByText('Hisob toza')).toBeTruthy();
    expect(screen.getByText("0 so'm")).toBeTruthy();
    expect(screen.queryByText("23 333 so'm")).toBeNull();
  });

  it("qisman to'langanda QOLDIQ ko'rsatiladi, yig'ilgan emas", async () => {
    await show(rental({ paidAmount: 10_000 }));

    expect(screen.getByText("13 333 so'm")).toBeTruthy();
    expect(screen.queryByText("23 333 so'm")).toBeNull();
  });

  it("oldindan to'lagan mijozga bu HAQ bo'lib ko'rinadi", async () => {
    // Ortiqcha to'lov yo'nalishni teskari aylantiradi: endi do'kon qarzdor.
    await show(rental({ owner: false, paidAmount: 30_000 }));

    expect(screen.getByText('Haq')).toBeTruthy();
    expect(screen.getByText("6 667 so'm")).toBeTruthy();
  });

  it("ortiqcha to'lov ombor egasida QARZ bo'ladi", async () => {
    await show(rental({ paidAmount: 30_000 }));

    expect(screen.getByText('Qarz')).toBeTruthy();
  });

  it('muddatsiz ijarada sana emas, "Muddat belgilanmagan" turadi', async () => {
    await show(rental({ openEnded: true }));

    expect(screen.getByText('Muddat belgilanmagan')).toBeTruthy();
  });
});
