import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import ScreenHeader from '../ScreenHeader';
import SectionHeader from '../SectionHeader';
import SettingsGroup from '../SettingsGroup';
import { AppThemeProvider, useAppTheme } from '../../theme';
import { AccentProvider } from '../../theme/AccentProvider';
import { LanguageProvider } from '../../i18n';

/**
 * Sarlavhalar TANLANGAN RANGDA.
 *
 * Rang ilovani to'liq qamrab olishi kerak va sarlavhalar uning eng
 * ko'rinadigan joyi. Mazmun matni bunga kirmaydi - uzun matnni rangli
 * qilish o'qishni qiyinlashtiradi.
 */
let brand = '';
const Probe: React.FC = () => {
  brand = useAppTheme().colors.primary;
  return null;
};

const show = (node: React.ReactElement) =>
  render(
    <AccentProvider>
      <AppThemeProvider>
        <LanguageProvider>
          <Probe />
          {node}
        </LanguageProvider>
      </AppThemeProvider>
    </AccentProvider>,
  );

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

/** Matn uslubidagi rangni oladi (uslub massiv bo'lishi mumkin). */
const colorOf = (node: { props: Record<string, any> }): string | undefined => {
  const flat = ([] as any[]).concat(node.props.style).filter(Boolean);
  for (const part of flat.reverse()) {
    if (part && typeof part === 'object' && 'color' in part) return part.color as string;
  }
  return undefined;
};

describe('sarlavha ranglari', () => {
  it('ekran sarlavhasi brend rangida', async () => {
    show(<ScreenHeader title="Sozlamalar" onBack={() => {}} />);
    await settle();

    expect(colorOf(screen.getByText('Sozlamalar'))).toBe(brand);
  });

  it('bolim sarlavhasi brend rangida', async () => {
    show(<SectionHeader title="Kontaktlar" icon="people" />);
    await settle();

    expect(colorOf(screen.getByText('Kontaktlar'))).toBe(brand);
  });

  it('guruh sarlavhasi brend rangida', async () => {
    show(<SettingsGroup title="Til"><></></SettingsGroup>);
    await settle();

    expect(colorOf(screen.getByText('Til'))).toBe(brand);
  });

  /** Izoh matni TEGILMAYDI: u mazmun, sarlavha emas. */
  it('izoh matni brend rangida emas', async () => {
    show(<ScreenHeader title="Sozlamalar" subtitle="Hisob va ilova" onBack={() => {}} />);
    await settle();

    expect(colorOf(screen.getByText('Hisob va ilova'))).not.toBe(brand);
  });
});
