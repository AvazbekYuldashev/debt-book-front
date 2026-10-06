import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import AmbientBackground, { BackgroundPhoto } from '../AmbientBackground';
import { AppThemeProvider } from '../../theme';
import { useBackground } from '../../theme/BackgroundProvider';

// Fon sozlamasi to'g'ridan-to'g'ri beriladi: haqiqiy provider hisob va
// xotiraga bog'liq, bu yerda esa faqat chizish geometriyasi tekshiriladi.
jest.mock('../../theme/BackgroundProvider', () => {
  const actual = jest.requireActual('../../theme/BackgroundProvider');
  return { ...actual, useBackground: jest.fn(actual.useBackground) };
});

const mockUseBackground = useBackground as jest.MockedFunction<typeof useBackground>;

const withPhoto = (dim: number) => {
  const actual = jest.requireActual('../../theme/BackgroundProvider');
  mockUseBackground.mockImplementation(() => ({
    ...actual.useBackground(),
    imageId: 'photo-1',
    fit: 'cover',
    dim,
  }));
};

const settle = () => act(async () => { await Promise.resolve(); });

/**
 * Rasm chiziladigan quti - sahna BackgroundPhoto'ga bergan uslub.
 * memo() komponentni tur bo'yicha topib bo'lmaydi - prop'lari bo'yicha.
 */
const photoBox = () => {
  const [photo] = screen.UNSAFE_root.findAll(
    (node) => node.props.uri !== undefined && node.props.blur !== undefined,
  );
  return StyleSheet.flatten(photo.props.style);
};

const backdropLayers = () =>
  screen
    .UNSAFE_queryAllByType(View)
    .filter((node) => {
      const style = StyleSheet.flatten(node.props.style) as Record<string, unknown> | undefined;
      return typeof style?.backdropFilter === 'string';
    });

describe('BackgroundPhoto', () => {
  afterEach(() => jest.restoreAllMocks());

  it("native: blur bitmapga beriladi, rasm qutidan chiqmaydi (zoom yo'q)", () => {
    const box = { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 300 };
    render(<BackgroundPhoto uri="https://x/y.jpg" fit="cover" blur={16} style={box} />);

    const image = screen.UNSAFE_getByType(Image);
    expect(image.props.blurRadius).toBe(16);
    expect(image.props.resizeMode).toBe('cover');
    // Rasm aynan berilgan qutini to'ldiradi - manfiy "bleed" yo'q.
    expect(StyleSheet.flatten(image.props.style)).toEqual(StyleSheet.absoluteFill);
    expect(backdropLayers()).toHaveLength(0);
  });

  it("web: rasmning o'ziga filter yo'q, xiralik backdrop qatlamida", () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    render(<BackgroundPhoto uri="https://x/y.jpg" fit="contain" blur={28} style={StyleSheet.absoluteFill} />);

    const image = screen.UNSAFE_getByType(Image);
    expect(image.props.blurRadius).toBeUndefined();
    expect(StyleSheet.flatten(image.props.style)).toEqual(StyleSheet.absoluteFill);

    const layers = backdropLayers();
    expect(layers).toHaveLength(1);
    const style = StyleSheet.flatten(layers[0].props.style) as Record<string, unknown>;
    expect(style.backdropFilter).toBe('blur(28px)');
    // Qatlam rasm bilan AYNAN bir xil qutida.
    expect(style).toMatchObject(StyleSheet.absoluteFill);
  });

  it("xiralik 0 - oddiy rasm, hech qanday qatlamsiz (asl holi)", () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    render(<BackgroundPhoto uri="https://x/y.jpg" fit="cover" blur={0} style={StyleSheet.absoluteFill} />);

    expect(screen.UNSAFE_getByType(Image).props.blurRadius).toBeUndefined();
    expect(backdropLayers()).toHaveLength(0);
  });
});

describe('AmbientBackground (fon rasmi)', () => {
  afterEach(() => mockUseBackground.mockReset());

  it("tablar ichida rasm qutisi panel ostigacha davom etadi, tepaga bog'langan", async () => {
    withPhoto(0);
    render(
      <AppThemeProvider>
        <BottomTabBarHeightContext.Provider value={70}>
          <AmbientBackground />
        </BottomTabBarHeightContext.Provider>
      </AppThemeProvider>,
    );
    await settle();

    expect(photoBox()).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: -70 });
  });

  it("tablardan tashqarida (kirish ekranlari) - konteynerni to'ldiradi", async () => {
    withPhoto(0);
    render(
      <AppThemeProvider>
        <AmbientBackground />
      </AppThemeProvider>,
    );
    await settle();

    expect(photoBox()).toEqual(StyleSheet.absoluteFill);
  });

  it("xiralik o'zgarsa quti o'zgarmaydi - faqat blur (rasm sakramaydi)", async () => {
    const boxAt = async (dim: number) => {
      withPhoto(dim);
      const view = render(
        <AppThemeProvider>
          <BottomTabBarHeightContext.Provider value={70}>
            <AmbientBackground />
          </BottomTabBarHeightContext.Provider>
        </AppThemeProvider>,
      );
      await settle();
      const result = { box: photoBox(), blur: screen.UNSAFE_getByType(Image).props.blurRadius };
      view.unmount();
      return result;
    };

    const none = await boxAt(0);
    const strong = await boxAt(0.7);

    expect(strong.box).toEqual(none.box);
    expect(none.blur).toBeUndefined();
    expect(strong.blur).toBe(28);
  });
});
