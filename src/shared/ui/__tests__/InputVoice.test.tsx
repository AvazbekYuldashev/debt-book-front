import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Input from '../Input';
import { AppThemeProvider } from '../../theme';
import { LanguageProvider } from '../../i18n';

/**
 * Maydonga ovoz tugmasini ulash.
 *
 * Tugma maydonning O'ZIDA emas, sarlavha qatorida turadi — shuning uchun
 * matn kiritish va tozalash avvalgidek ishlashi shart. Bu testlar aynan
 * shuni qulflaydi: ovoz qo'shilgani bilan oddiy maydon xatti-harakati
 * o'zgarmasin.
 */

const recorder = { isTypeSupported: () => true };

beforeEach(() => {
  (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = recorder;
  (globalThis as unknown as { window: { MediaRecorder?: unknown } }).window.MediaRecorder = recorder;
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: jest.fn() },
  });
});

const renderInput = (props: Partial<React.ComponentProps<typeof Input>> = {}) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <Input label="Izoh" placeholder="Yozing" {...props} />
      </LanguageProvider>
    </AppThemeProvider>,
  );

describe('Input + ovoz', () => {
  it("voice berilmasa mikrofon chiqmaydi", async () => {
    renderInput();
    await act(async () => {});
    expect(screen.queryByLabelText('Ovoz bilan yozish')).toBeNull();
  });

  it('voice berilsa mikrofon sarlavha yonida chiqadi', async () => {
    renderInput({ voice: { kind: 'NOTE', onResult: jest.fn() } });
    await act(async () => {});

    expect(screen.getByText('Izoh')).toBeTruthy();
    expect(screen.getByLabelText('Ovoz bilan yozish')).toBeTruthy();
  });

  it("qo'lda yozish avvalgidek ishlaydi", async () => {
    const onChangeText = jest.fn();
    renderInput({ voice: { kind: 'NOTE', onResult: jest.fn() }, onChangeText });
    await act(async () => {});

    fireEvent.changeText(screen.getByPlaceholderText('Yozing'), 'non pul');
    expect(onChangeText).toHaveBeenCalledWith('non pul');
  });

  /** Maydon xatosi ovoz xatosidan ustun — u to'g'ridan-to'g'ri saqlashga to'sqinlik qiladi. */
  it('maydon xatosi ko\'rsatiladi', async () => {
    renderInput({ error: 'Summa xato', voice: { kind: 'NOTE', onResult: jest.fn() } });
    await act(async () => {});
    expect(screen.getByText('Summa xato')).toBeTruthy();
  });
});
