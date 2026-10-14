import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import DateField from '../DateField';
import { AppThemeProvider } from '../../theme';
import { LanguageProvider } from '../../i18n';

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

const onChange = jest.fn();

const show = async (value = '2026-10-15') => {
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <DateField label="Berilgan kun" value={value} onChange={onChange} />
      </LanguageProvider>
    </AppThemeProvider>,
  );
  await settle();
};

const openCalendar = () => fireEvent.press(screen.getByLabelText(/Berilgan kun:/));

beforeEach(() => onChange.mockReset());

/**
 * Sana TANLANADI, yozilmaydi.
 *
 * Ilgari u oddiy matn maydoni edi va odam "2026-10-15" ni qo'lda
 * terardi: ijarada sana — pulning o'zi (kun soni shundan chiqadi),
 * bitta xato raqam butun hisobni surib yuborardi.
 */
describe('sana tanlagich', () => {
  it('yopiq holatda faqat tanlangan sana ko\'rinadi', async () => {
    await show();

    expect(screen.getByText('2026-10-15')).toBeTruthy();
    // Kalendar bosilmaguncha ochilmaydi — forma uzayib ketmasligi kerak.
    expect(screen.queryByText('Oktabr 2026')).toBeNull();
  });

  it('bosilganda tanlangan sananing OYI ochiladi', async () => {
    await show();

    openCalendar();

    expect(screen.getByText('Oktabr 2026')).toBeTruthy();
  });

  it('kun bosilsa sana shu kunga o\'zgaradi', async () => {
    await show();
    openCalendar();

    fireEvent.press(screen.getByLabelText('2026-10-22'));

    expect(onChange).toHaveBeenCalledWith('2026-10-22');
  });

  it('tanlangandan keyin kalendar yopiladi', async () => {
    await show();
    openCalendar();
    fireEvent.press(screen.getByLabelText('2026-10-08'));
    await settle();

    expect(screen.queryByText('Oktabr 2026')).toBeNull();
  });

  it('oldinga va orqaga oy almashtiriladi', async () => {
    await show();
    openCalendar();

    fireEvent.press(screen.getByLabelText('Keyingi oy'));
    expect(screen.getByText('Noyabr 2026')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Oldingi oy'));
    fireEvent.press(screen.getByLabelText('Oldingi oy'));
    expect(screen.getByText('Sentabr 2026')).toBeTruthy();
  });

  it('yil chegarasidan to\'g\'ri o\'tadi', async () => {
    await show('2026-12-10');
    openCalendar();

    fireEvent.press(screen.getByLabelText('Keyingi oy'));

    expect(screen.getByText('Yanvar 2027')).toBeTruthy();
  });

  it("oyning birinchi kuni TO'G'RI ustunga tushadi", async () => {
    // 2026-10-01 — payshanba. Dushanbadan boshlanadigan haftada undan
    // oldin uchta bo'sh katak turishi kerak; sanashda xato bo'lsa butun
    // oy bir ustunga surilib ketardi.
    await show('2026-10-15');
    openCalendar();

    // Bir oyda nechta kun bo'lsa shuncha bosiladigan katak bor.
    expect(screen.getByLabelText('2026-10-01')).toBeTruthy();
    expect(screen.getByLabelText('2026-10-31')).toBeTruthy();
    expect(screen.queryByLabelText('2026-10-32')).toBeNull();
  });

  it('"Bugun" tugmasi bugungi sanani qo\'yadi', async () => {
    await show('2020-01-01');
    openCalendar();

    fireEvent.press(screen.getByText('Bugun'));

    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(onChange).toHaveBeenCalledWith(expected);
  });
});
