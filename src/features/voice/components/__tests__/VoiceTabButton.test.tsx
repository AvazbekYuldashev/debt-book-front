import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import VoiceTabButton from '../VoiceTabButton';
import { AppThemeProvider, useAppTheme, type ColorTokens } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import { VOICE_BUTTON_CLEARANCE, VOICE_BUTTON_SIZE } from '../../../../shared/ui/fabLayout';
import {
  VoiceActionProvider,
  useRegisterVoiceAction,
  type VoiceAction,
} from '../../model/VoiceActionProvider';
import type { VoiceInput } from '../../model/useVoiceInput';

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));

// Yozish holatini o'zimiz beramiz: tugmaning ko'rinishi faqat shunga bog'liq.
let mockVoice: VoiceInput;
jest.mock('../../model/useVoiceInput', () => ({ useVoiceInput: () => mockVoice }));

const idleVoice = (patch: Partial<VoiceInput> = {}): VoiceInput => ({
  supported: true,
  visible: true,
  state: 'idle',
  error: null,
  start: jest.fn(),
  stop: jest.fn(),
  clearError: jest.fn(),
  ...patch,
});

const ACTION: VoiceAction = { kind: 'TRANSACTION', onResult: () => undefined };

const Screen: React.FC = () => {
  useRegisterVoiceAction(ACTION);
  return null;
};

let colors: ColorTokens;
const Probe: React.FC = () => {
  colors = useAppTheme().colors;
  return null;
};

const show = (withScreen: boolean) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <VoiceActionProvider>
          <Probe />
          {withScreen ? <Screen /> : null}
          <VoiceTabButton />
        </VoiceActionProvider>
      </LanguageProvider>
    </AppThemeProvider>,
  );

const buttonStyle = async () => {
  const button = await screen.findByLabelText('Ovoz bilan yozish');
  return { button, style: StyleSheet.flatten(button.props.style) };
};

beforeEach(() => { mockVoice = idleVoice(); });

describe('VoiceTabButton', () => {
  /**
   * O'CHIQ holat SHAFFOF EMAS: doira panel chizig'ini kesib o'tadi va
   * `opacity` ortidagi fon rasmi bilan panelni ikki tusda ko'rsatardi.
   */
  it('ishlovchi yoq bolsa toliq neytral sirt, shaffof emas', async () => {
    show(false);
    const { button, style } = await buttonStyle();

    expect(style.opacity).toBeUndefined();
    expect(style.backgroundColor).toBe(colors.surface);
    expect(style.shadowColor).toBe(colors.shadow);
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('ishlovchi bor bolsa faol, brend rangida', async () => {
    show(true);
    const { button, style } = await buttonStyle();

    expect(style.opacity).toBeUndefined();
    expect(style.backgroundColor).toBe(colors.primary);
    expect(button.props.accessibilityState).toMatchObject({ disabled: false, busy: false });
  });

  /** Ishlov paytida tugma bosilmaydi - ekran o'quvchiga ham shunday aytiladi. */
  it('ishlov paytida disabled va busy', async () => {
    mockVoice = idleVoice({ state: 'working' });
    show(true);
    const { button } = await buttonStyle();

    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
  });

  /** Doira paneldan yarmi bilan chiqadi - pastki tugmalar undan yuqorida turishi kerak. */
  it('boshliq doiraning chiqib turgan qismidan katta', () => {
    expect(VOICE_BUTTON_CLEARANCE).toBeGreaterThan(VOICE_BUTTON_SIZE / 2);
  });
});
