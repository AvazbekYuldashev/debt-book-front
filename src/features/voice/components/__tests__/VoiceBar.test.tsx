import React from 'react';
import { render, screen } from '@testing-library/react-native';
import VoiceBar from '../VoiceBar';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';

/**
 * Formaning tepasidagi "Ovoz bilan to'ldirish" tugmasi.
 *
 * Bu tugma ataylab YOZUVLI va butun kenglikda. Ilgari mikrofon maydon
 * sarlavhasining chetida kichik ikonka edi — u bor edi, lekin foydalanuvchi
 * uni topolmadi. Shuning uchun testda aynan YOZUV qidiriladi: ikonkaning
 * o'zi yetarli emasligi shu ishning sababi edi.
 */

type RecorderStub = { isTypeSupported: (type: string) => boolean };

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

const renderBar = () =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <VoiceBar kind="TRANSACTION" onResult={jest.fn()} />
      </LanguageProvider>
    </AppThemeProvider>,
  );

describe('VoiceBar', () => {
  afterEach(() => jest.clearAllMocks());

  it('yozuvi bilan ko\'rinadi — ikonkaning o\'zi emas', async () => {
    setRecorder({ isTypeSupported: () => true });
    setMediaDevices(true);

    renderBar();

    expect(await screen.findByText("Ovoz bilan to'ldirish")).toBeTruthy();
  });

  it('yozib olib bo\'lmaydigan qurilmada umuman chiqmaydi', () => {
    setRecorder(undefined);
    setMediaDevices(true);

    renderBar();

    expect(screen.queryByText("Ovoz bilan to'ldirish")).toBeNull();
  });

  it('mikrofonga kirish yo\'q bo\'lsa chiqmaydi', () => {
    setRecorder({ isTypeSupported: () => true });
    setMediaDevices(false);

    renderBar();

    expect(screen.queryByText("Ovoz bilan to'ldirish")).toBeNull();
  });
});
