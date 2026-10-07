import React from 'react';
import { Platform, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { AppThemeProvider, NestedGlass, useAppTheme } from '../ThemeProvider';
import { BackgroundProvider } from '../BackgroundProvider';
import { TransparencyProvider } from '../TransparencyProvider';

jest.mock('../photoColor', () => ({
  samplePhoto: () => Promise.resolve(null),
  peekPhoto: () => null,
}));

const Probe: React.FC<{ id: string }> = ({ id }) => {
  const { glass, glassNested } = useAppTheme();
  return <Text testID={id}>{glass === glassNested ? 'nested' : 'top'}</Text>;
};

const tree = () => (
  <BackgroundProvider>
    <TransparencyProvider>
      <AppThemeProvider>
        <Probe id="outside" />
        <NestedGlass>
          <Probe id="inside" />
          <NestedGlass>
            <Probe id="deeper" />
          </NestedGlass>
        </NestedGlass>
      </AppThemeProvider>
    </TransparencyProvider>
  </BackgroundProvider>
);

/**
 * Sirt ICHIDAGI hamma narsa ichki shishani oladi (muzlatishsiz, oq
 * xiraliksiz) - karta yoki dialog ichidagi tugma ota sirtni qayta
 * muzlatmasin. Ichma-ich qo'yish xavfsiz.
 */
describe('NestedGlass', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
  });

  it("web: ichkarida ichki shisha, tashqarida oddiy", async () => {
    Platform.OS = 'web';
    render(tree());
    expect((await screen.findByTestId('outside')).props.children).toBe('top');
    expect(screen.getByTestId('inside').props.children).toBe('nested');
    expect(screen.getByTestId('deeper').props.children).toBe('nested');
  });

  /** Telefonda muzlatish yo'q - ikkala shisha bitta. */
  it('telefon: farq yo\'q', async () => {
    render(tree());
    expect((await screen.findByTestId('outside')).props.children).toBe('nested');
  });
});
