import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import LoginScreen from '../LoginScreen';
import ResetPasswordScreen from '../ResetPasswordScreen';
import ResetConfirmScreen from '../ResetConfirmScreen';
import SmsVerificationScreen from '../SmsVerificationScreen';

/**
 * Kirish ekranlarining umumiy qolipi.
 *
 * Qolip qayta yozildi: shisha karta va markazga tekislangan sarlavha
 * o'rniga chapga tekislangan katta sarlavha va gradientli asosiy tugma.
 * Bu yerda har ekran RENDER BO'LISHI va o'z asosiy tugmasini
 * ko'rsatishi tekshiriladi - qolipni almashtirishda eng oson
 * sinadigan narsa aynan shu.
 */
const nav = { navigate: jest.fn(), goBack: jest.fn() } as any;

const show = (node: React.ReactElement) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>{node}</LanguageProvider>
    </AppThemeProvider>,
  );

/** AppThemeProvider birinchi renderda null qaytaradi - uni tinchitamiz. */
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

afterEach(() => jest.clearAllMocks());

describe('auth qolipi', () => {
  it('kirish ekrani sarlavha va tugma bilan chiqadi', async () => {
    show(<LoginScreen navigation={nav} />);
    await settle();

    // "Kirish" ikki joyda: sarlavha va tugma - ikkovi ham bo'lishi kerak.
    expect(screen.getAllByText('Kirish')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Kirish' })).toBeTruthy();
  });

  /** Hisobi yo'q odam uchun yo'l ekran tagida turadi. */
  it('kirish ekranida royxatdan otish havolasi bor', async () => {
    show(<LoginScreen navigation={nav} />);
    await settle();

    expect(screen.getByText("Hisobingiz yo'qmi?")).toBeTruthy();
    expect(screen.getByText("Ro'yxatdan o'tish")).toBeTruthy();
  });

  /**
   * Qisqa formalarda tugma PASTGA mixlanadi: maydon bittagina bo'lgani
   * uchun u ekran o'rtasida osilib qolardi.
   */
  it('parolni tiklash ekrani pastga mixlangan tugma bilan', async () => {
    show(<ResetPasswordScreen navigation={nav} />);
    await settle();

    expect(screen.getByRole('button', { name: 'Yuborish' })).toBeTruthy();
  });

  it('tasdiqlash ekrani tugma bilan chiqadi', async () => {
    show(<ResetConfirmScreen navigation={nav} />);
    await settle();

    expect(screen.getByRole('button', { name: 'Yangilash' })).toBeTruthy();
  });

  it('sms ekrani tugma va qayta yuborish bilan chiqadi', async () => {
    show(
      <SmsVerificationScreen
        navigation={nav}
        route={{ key: 'k', name: 'SmsVerification', params: { username: '901234567' } } as any}
      />,
    );
    await settle();

    expect(screen.getByText('Kod kelmadimi?')).toBeTruthy();
  });
});
