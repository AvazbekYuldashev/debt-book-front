import React from 'react';
import { render, screen } from '@testing-library/react-native';
import VoiceMicButton from '../VoiceMicButton';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';

/**
 * Tugma qurilma yozib olishni qo'llab-quvvatlagandagina chiqishi kerak.
 *
 * Bu shunchaki chiroyli ko'rinish masalasi emas: Android ilovasida hozircha
 * yozib olish yo'q, va u yerda tugma chiqsa odam bosib, hech narsa
 * bo'lmaganini ko'rib, ilova buzilgan deb o'ylardi.
 */

type RecorderStub = { isTypeSupported: (type: string) => boolean };

const withProviders = (ui: React.ReactElement) => (
  <AppThemeProvider>
    <LanguageProvider>{ui}</LanguageProvider>
  </AppThemeProvider>
);

const setRecorder = (recorder: RecorderStub | undefined) => {
  (globalThis as unknown as { MediaRecorder?: RecorderStub }).MediaRecorder = recorder;
  (globalThis as unknown as { window: { MediaRecorder?: RecorderStub } }).window.MediaRecorder = recorder;
};

const setMediaDevices = (available: boolean) => {
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: available ? { getUserMedia: jest.fn() } : undefined,
  });
};

describe('VoiceMicButton', () => {
  const original = (globalThis as unknown as { MediaRecorder?: RecorderStub }).MediaRecorder;

  afterEach(() => {
    setRecorder(original);
    jest.clearAllMocks();
  });

  it('yozib olish mumkin bo\'lganda ko\'rinadi', async () => {
    setRecorder({ isTypeSupported: () => true });
    setMediaDevices(true);

    render(withProviders(<VoiceMicButton kind="NOTE" onResult={jest.fn()} />));

    expect(await screen.findByLabelText('Ovoz bilan yozish')).toBeTruthy();
  });

  it('MediaRecorder yo\'q qurilmada umuman chiqmaydi', () => {
    setRecorder(undefined);
    setMediaDevices(true);

    render(withProviders(<VoiceMicButton kind="NOTE" onResult={jest.fn()} />));

    expect(screen.queryByLabelText('Ovoz bilan yozish')).toBeNull();
  });

  it('mikrofonga kirish yo\'q bo\'lsa chiqmaydi', () => {
    setRecorder({ isTypeSupported: () => true });
    setMediaDevices(false);

    render(withProviders(<VoiceMicButton kind="NOTE" onResult={jest.fn()} />));

    expect(screen.queryByLabelText('Ovoz bilan yozish')).toBeNull();
  });

  it('hech qaysi format qo\'llab-quvvatlanmasa chiqmaydi', () => {
    // Yozuvchi bor, lekin bironta audio formatini bilmaydi.
    setRecorder({ isTypeSupported: () => false });
    setMediaDevices(true);

    render(withProviders(<VoiceMicButton kind="NOTE" onResult={jest.fn()} />));

    expect(screen.queryByLabelText('Ovoz bilan yozish')).toBeNull();
  });
});
