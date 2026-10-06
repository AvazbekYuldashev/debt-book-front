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
/**
 * Bitta umumiy `mockFocused` ikki tabni ALOHIDA boshqara olmaydi: poyga
 * aynan "biri fokusda, ikkinchisi hali fokusni yo'qotmagan" oralig'ida.
 * Shuning uchun har ekran o'z fokusini kontekstdan oladi; kontekst
 * berilmagan joyda eski umumiy qiymat ishlaydi.
 */
jest.mock('@react-navigation/native', () => {
  const { createContext, useContext } = jest.requireActual('react');
  const MockFocusContext = createContext(undefined);
  return {
    MockFocusContext,
    useIsFocused: () => useContext(MockFocusContext) ?? mockFocused,
  };
});

const { MockFocusContext } = jest.requireMock<{
  MockFocusContext: React.Context<boolean | undefined>;
}>('@react-navigation/native');

/**
 * Ovoz tugmasi pastki panelda, natijani esa EKRAN qayta ishlaydi.
 * Ro'yxat ikkovini bog'laydi va fokusga tayanadi: ko'rinmayotgan ekran
 * buyruqni qabul qilmasligi kerak.
 */
const noop = () => undefined;

const Screen: React.FC<{ onResult?: () => void; kind?: 'GAP' | 'TRANSACTION' }> = ({
  onResult = noop,
  kind = 'GAP',
}) => {
  const action = React.useMemo(() => ({ kind, onResult }), [kind, onResult]);
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

  /**
   * TAB ALMASHISH POYGASI (Qarzlar -> Gap kassa).
   *
   * Haqiqiy tartib: Gap ekrani mount paytidayoq fokusda va ishlovchisini
   * yozadi; Qarzlar fokusni navigatorning "blur" hodisasidan KEYINGI
   * commit'da yo'qotadi. Ilgari Qarzlarning tozalashi `register(null)`
   * qilib, Gap'ning yangi ishlovchisini o'chirib yuborardi - mikrofon
   * Gap'da o'chiq qolardi.
   */
  it('ketayotgan ekran yangi ekranning ishlovchisini ochirmaydi', async () => {
    // `undefined` - ekran hali mount qilinmagan.
    const tabs = (debts: boolean, gap?: boolean) => (
      <VoiceActionProvider>
        <MockFocusContext.Provider value={debts}>
          <Screen kind="TRANSACTION" />
        </MockFocusContext.Provider>
        {gap === undefined ? null : (
          <MockFocusContext.Provider value={gap}>
            <Screen kind="GAP" />
          </MockFocusContext.Provider>
        )}
        <Button />
      </VoiceActionProvider>
    );

    // 1) Qarzlar fokusda va yozilgan.
    const view = render(tabs(true));
    await settle();
    expect(screen.getByTestId('kind').props.children).toBe('TRANSACTION');

    // 2) Gap ochildi: o'zi fokusda, Qarzlar hali "blur" olmagan.
    await act(async () => { view.rerender(tabs(true, true)); });
    expect(screen.getByTestId('kind').props.children).toBe('GAP');

    // 3) Qarzlar fokusni yo'qotdi - Gap'ning ishlovchisi QOLADI.
    await act(async () => { view.rerender(tabs(false, true)); });
    expect(screen.getByTestId('kind').props.children).toBe('GAP');

    // 4) Gap'ning o'z blur'i esa o'zini tozalaydi.
    await act(async () => { view.rerender(tabs(false, false)); });
    expect(screen.getByTestId('kind').props.children).toBe('yoq');
  });
});
