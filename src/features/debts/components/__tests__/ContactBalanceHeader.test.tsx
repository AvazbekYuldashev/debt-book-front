import React from 'react';
import { render } from '@testing-library/react-native';
import ContactBalanceHeader from '../ContactBalanceHeader';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { Contact } from '../../context/ContactsContext';

const contact = (over: Partial<Contact>): Contact =>
  ({
    id: 'c-1',
    firstName: 'Ali',
    lastName: '',
    phone: '',
    username: '',
    fullName: 'Ali',
    partyType: 'PROFILE',
    partyId: 'p-1',
    debtAmount: 0,
    interestAmount: 0,
    ...over,
  }) as Contact;

const show = (over: Partial<Contact>) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <ContactBalanceHeader contact={contact(over)} balances={[]} onBack={jest.fn()} />
      </LanguageProvider>
    </AppThemeProvider>,
  );

/*
 * XABAR tugmasi qurilmaning SMS ilovasini ochadi — ilova o'zi
 * yubormaydi. Biznesning o'z telefoni yo'q, shuning uchun raqam
 * EGASINIKI bo'ladi: ilgari biznes kontaktida xabar yuborish yo'li
 * umuman yo'q edi.
 */
describe('ContactBalanceHeader — xabar tugmasi', () => {
  it('shaxsiy kontakt: tugma chiqadi', async () => {
    const { findByLabelText } = show({ phone: '998901234567' });
    expect(await findByLabelText('Xabar yuborish')).toBeTruthy();
  });

  it('biznes kontakt: egasining raqamiga tugma chiqadi', async () => {
    const { findByLabelText } = show({
      partyType: 'BUSINESS_ACCOUNT',
      username: 'yangi_market',
      fullName: 'yangi_market',
      businessPhone: '998905291915',
    });

    expect(await findByLabelText('Xabar yuborish')).toBeTruthy();
  });

  it('raqam umuman yo‘q — tugma ham yo‘q', async () => {
    const { queryByLabelText, findByLabelText } = show({
      partyType: 'BUSINESS_ACCOUNT',
      username: 'telefonsiz',
      fullName: 'telefonsiz',
    });

    // Karta chizilguncha kutamiz — mavzu birinchi renderda null qaytaradi.
    await findByLabelText('Orqaga');
    expect(queryByLabelText('Xabar yuborish')).toBeNull();
  });
});
