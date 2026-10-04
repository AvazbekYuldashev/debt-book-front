import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import ScreenHeader from '../ScreenHeader';
import SectionHeader from '../SectionHeader';
import { AppThemeProvider } from '../../theme';
import { LanguageProvider } from '../../i18n';

/**
 * Sarlavhalarda KONTUR bo'lishi kerak.
 *
 * U matnni har qanday fondan ajratib turadi - bezakli naqsh bo'ladimi,
 * foydalanuvchi qo'ygan fotosuratmi. Bu yerda wiring tekshiriladi:
 * yordamchi funksiyaning o'zi alohida sinaladi, bu test esa uslub
 * haqiqatan matnga YETIB BORGANINI qulflaydi.
 */
const show = (node: React.ReactElement) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>{node}</LanguageProvider>
    </AppThemeProvider>,
  );

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

const styleOf = (node: { props: Record<string, any> }) =>
  StyleSheet.flatten(node.props.style) as Record<string, unknown>;

describe('sarlavha konturi', () => {
  it('ekran sarlavhasida kontur bor', async () => {
    show(<ScreenHeader title="Sozlamalar" onBack={() => {}} />);
    await settle();

    const style = styleOf(screen.getByText('Sozlamalar'));
    expect(style.textShadowColor).toBe('#FFFFFF');
    expect(style.textShadowRadius).toBeGreaterThan(0);
  });

  it('ekran izohida ham kontur bor', async () => {
    show(<ScreenHeader title="Profil" subtitle="Hisob va ilova" onBack={() => {}} />);
    await settle();

    expect(styleOf(screen.getByText('Hisob va ilova')).textShadowColor).toBe('#FFFFFF');
  });

  it('bolim sarlavhasida kontur bor', async () => {
    show(<SectionHeader title="Kontaktlar" icon="people" />);
    await settle();

    expect(styleOf(screen.getByText('Kontaktlar')).textShadowColor).toBe('#FFFFFF');
  });
});
