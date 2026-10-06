import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import ScreenHeader from '../ScreenHeader';
import SectionHeader from '../SectionHeader';
import { AppThemeProvider } from '../../theme';
import { LanguageProvider } from '../../i18n';

/**
 * Fon ustidagi sarlavhalar O'Z SIRTIDA turadi.
 *
 * Ilgari ekran sarlavhasi kontur (matn soyasi) bilan himoyalangan edi.
 * Sarlavhaning o'zi yuqori parda ostida o'qilardi, lekin kulrang izoh
 * parda so'nayotgan joyda turadi va to'q fon rasmida yorug' mavzuda
 * ko'rinmay qolardi. Endi ikkalasi ham bo'lim sarlavhalari kabi sirtda.
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

/** Matnni o'rab turgan birinchi FONLI ota - oraliq tugunlar bo'lishi mumkin. */
const surfaceOf = (node: any): Record<string, unknown> => {
  let current = node?.parent;
  while (current) {
    const style = StyleSheet.flatten(current.props?.style) as Record<string, unknown> | undefined;
    if (style?.backgroundColor) return style;
    current = current.parent;
  }
  return {};
};

describe('sarlavhalar sirtda', () => {
  it('ekran sarlavhasi oz sirtida turadi', async () => {
    show(<ScreenHeader title="Sozlamalar" onBack={() => {}} />);
    await settle();

    const title = screen.getByText('Sozlamalar');
    expect(styleOf(title).textShadowColor).toBeUndefined();
    expect(surfaceOf(title).backgroundColor).toBeTruthy();
    expect(surfaceOf(title).borderRadius).toBeTruthy();
  });

  it('ekran izohi ham sirtda turadi', async () => {
    show(<ScreenHeader title="Profil" subtitle="Hisob va ilova" onBack={() => {}} />);
    await settle();

    expect(surfaceOf(screen.getByText('Hisob va ilova')).backgroundColor).toBeTruthy();
  });

  /**
   * BO'LIM SARLAVHASIDA KONTUR EMAS, SIRT.
   *
   * U ekran o'rtasida, yuqoridagi pardadan pastda turadi - u yerda fon
   * hech narsa bilan yumshatilmaydi. Ingichka kontur to'q rasmda to'q
   * matnni qutqarmasdi, shuning uchun yorliq o'z foniga ko'chdi.
   */
  it('bolim sarlavhasi oz sirtida turadi', async () => {
    show(<SectionHeader title="Kontaktlar" icon="people" />);
    await settle();

    const label = screen.getByText('Kontaktlar');
    expect(styleOf(label).textShadowColor).toBeUndefined();

    // Yorliqni o'rab turgan qatorda fon bo'lishi shart.
    const wrap = label.parent?.parent;
    const wrapStyle = StyleSheet.flatten(wrap?.props?.style) as Record<string, unknown>;
    expect(wrapStyle.backgroundColor).toBeTruthy();
    expect(wrapStyle.borderRadius).toBeTruthy();
  });
});
