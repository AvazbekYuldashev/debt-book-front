import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { AccentProvider, useAccent } from '../AccentProvider';
import { AppThemeProvider, useAppTheme } from '../ThemeProvider';
import { findAccent } from '../accent';

/**
 * Tanlangan rang MAVZUGA yetib borishi kerak.
 *
 * Brand rangi ilovada 67 ta joyda `colors.primary` orqali o'qiladi -
 * demak bu bog'lanish uzilsa, tanlov hech narsani o'zgartirmaydi va
 * buni faqat ekranga qarab sezish mumkin bo'lardi.
 */
const Probe: React.FC = () => {
  const { colors } = useAppTheme();
  const { accent, setAccent, adoptAccent } = useAccent();

  // Testdan boshqarish uchun: React tashqarisidan chaqirib bo'lmaydi.
  handles = { setAccent, adoptAccent };

  return (
    <>
      <Text testID="primary">{colors.primary}</Text>
      <Text testID="positive">{colors.positive}</Text>
      <Text testID="accent">{accent}</Text>
    </>
  );
};

let handles: {
  setAccent: (id: string) => void;
  adoptAccent: (profileId: string | null, remote: string | null | undefined) => void;
};

const show = () =>
  render(
    <AccentProvider>
      <AppThemeProvider>
        <Probe />
      </AppThemeProvider>
    </AccentProvider>,
  );

/** AppThemeProvider birinchi renderda null qaytaradi - uni tinchitamiz. */
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

describe('AccentProvider + mavzu', () => {
  it('standart rang yashil', async () => {
    show();
    await settle();

    expect(screen.getByTestId('accent').props.children).toBe('green');
    expect(screen.getByTestId('primary').props.children)
      .toBe(findAccent('green').light.primary);
  });

  it('rang tanlanganda mavzu qayta boyaladi', async () => {
    show();
    await settle();

    await act(async () => { handles.setAccent('violet'); });

    expect(screen.getByTestId('primary').props.children)
      .toBe(findAccent('violet').light.primary);
  });

  /**
   * MA'NO tashiydigan ranglar tegilmaydi: binafsha tanlagan odam ham
   * qarzni haqdan ajrata olishi kerak.
   */
  it('qarz va haq ranglari ozgarmaydi', async () => {
    show();
    await settle();
    const avval = screen.getByTestId('positive').props.children;

    await act(async () => { handles.setAccent('amber'); });

    expect(screen.getByTestId('positive').props.children).toBe(avval);
  });

  /** Serverdan kelgan qiymat qo'llanadi - hisob bilan birga ergashadi. */
  it('hisobdagi rang qollanadi', async () => {
    show();
    await settle();

    await act(async () => { handles.adoptAccent('p1', 'teal'); });

    expect(screen.getByTestId('accent').props.children).toBe('teal');
  });

  /** Chiqib ketilganda standartga qaytadi - keyingi odam o'zinikini ko'radi. */
  it('chiqilganda standartga qaytadi', async () => {
    show();
    await settle();
    await act(async () => { handles.adoptAccent('p1', 'blue'); });

    await act(async () => { handles.adoptAccent(null, null); });

    expect(screen.getByTestId('accent').props.children).toBe('green');
  });

  /** Noma'lum belgi ekranni buzmaydi. */
  it('notanish belgi standartga tushadi', async () => {
    show();
    await settle();

    await act(async () => { handles.adoptAccent('p1', 'rainbow'); });

    expect(screen.getByTestId('accent').props.children).toBe('green');
  });
});
