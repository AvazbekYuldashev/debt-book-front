import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import {
  VoiceActionProvider,
  useRegisterVoiceAction,
  useVoiceAction,
} from '../VoiceActionProvider';

// Fokus holati navigatsiyadan keladi - testda uni o'zimiz boshqaramiz.
// Nomi `mock` bilan boshlanishi SHART: jest fabrikasiga faqat shunday
// o'zgaruvchilarga murojaat qilishga ruxsat beradi.
let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));

/**
 * Ovoz tugmasi pastki panelda, natijani esa EKRAN qayta ishlaydi.
 * Ro'yxat ikkovini bog'laydi va fokusga tayanadi: ko'rinmayotgan ekran
 * buyruqni qabul qilmasligi kerak.
 */
const Screen: React.FC<{ onResult: () => void }> = ({ onResult }) => {
  const action = React.useMemo(
    () => ({ kind: 'GAP' as const, onResult }),
    [onResult],
  );
  useRegisterVoiceAction(action);
  return null;
};

const Button: React.FC = () => {
  const action = useVoiceAction();
  return <Text testID="kind">{action ? action.kind : 'yoq'}</Text>;
};

const show = (withScreen: boolean, onResult = jest.fn()) =>
  render(
    <VoiceActionProvider>
      {withScreen ? <Screen onResult={onResult} /> : null}
      <Button />
    </VoiceActionProvider>,
  );

const settle = () => act(async () => { await Promise.resolve(); });

beforeEach(() => { mockFocused = true; });

describe('VoiceActionProvider', () => {
  it('ekran oz ishlovchisini elon qiladi', async () => {
    show(true);
    await settle();

    expect(screen.getByTestId('kind').props.children).toBe('GAP');
  });

  /** Ekran yo'q bo'lsa tugma bosilmaydigan holatda turadi. */
  it('ekransiz ishlovchi yoq', async () => {
    show(false);
    await settle();

    expect(screen.getByTestId('kind').props.children).toBe('yoq');
  });

  /**
   * FOKUS SHART: Profilda turib gapirilgan buyruq ko'rinmayotgan
   * Qarzlar ekranida forma ochib yuborardi.
   */
  it('fokus yoq bolsa elon qilinmaydi', async () => {
    mockFocused = false;
    show(true);
    await settle();

    expect(screen.getByTestId('kind').props.children).toBe('yoq');
  });

  /** Ekran yopilganda ro'yxat tozalanadi. */
  it('ekran yopilganda ishlovchi ochadi', async () => {
    const view = show(true);
    await settle();
    expect(screen.getByTestId('kind').props.children).toBe('GAP');

    await act(async () => {
      view.rerender(
        <VoiceActionProvider>
          <Button />
        </VoiceActionProvider>,
      );
    });

    expect(screen.getByTestId('kind').props.children).toBe('yoq');
  });
});
