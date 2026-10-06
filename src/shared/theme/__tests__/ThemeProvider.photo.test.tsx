import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { AppThemeProvider, useAppTheme } from '../ThemeProvider';
import { BackgroundProvider, useBackground } from '../BackgroundProvider';
import { TransparencyProvider, useTransparency } from '../TransparencyProvider';
import type { TransparencyLevel } from '../transparency';
import type { Rgb } from '../photoTone';

const mockSample = jest.fn<Promise<Rgb | null>, [string]>();
jest.mock('../photoColor', () => ({
  samplePhotoColor: (url: string) => mockSample(url),
}));

const DARK_PHOTO = { r: 58, g: 68, b: 84 };

const Probe: React.FC<{ level: TransparencyLevel; image: boolean }> = ({ level, image }) => {
  const { activeTheme, mode, setMode, photoAdapted } = useAppTheme();
  const { setImage } = useBackground();
  const { setLevel } = useTransparency();

  // Bir marta: `setImage` har sozlama o'zgarishida yangi havola bo'ladi
  // va bog'liqlik ro'yxatida cheksiz tsikl yasardi.
  useEffect(() => {
    setMode('light');
    setLevel(level);
    if (image) setImage('photo-1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Text testID="theme">{`${activeTheme}|${mode}${photoAdapted ? '|adapted' : ''}`}</Text>;
};

const show = (level: TransparencyLevel, image = true) =>
  render(
    <BackgroundProvider>
      <TransparencyProvider>
        <AppThemeProvider>
          <Probe level={level} image={image} />
        </AppThemeProvider>
      </TransparencyProvider>
    </BackgroundProvider>,
  );

const settle = () =>
  act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  });

/**
 * Yorug' mavzu + to'q fon rasmi + "Ko'p" shaffoflik: matn o'qilishi
 * uchun mavzu rasmga moslashadi, foydalanuvchi tanlovi esa saqlanadi.
 */
describe('AppThemeProvider - fon rasmi ustida', () => {
  beforeEach(() => {
    mockSample.mockReset();
    mockSample.mockResolvedValue(DARK_PHOTO);
  });

  it("to'q rasm + Ko'p -> qorong'i mavzu, tanlov esa yorug'", async () => {
    show('clear');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('dark|light|adapted');
    expect(mockSample).toHaveBeenCalledWith(expect.stringContaining('/attach/open/photo-1'));
  });

  it("O'rta darajada yorug' mavzu qoladi", async () => {
    show('medium');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('light|light');
  });

  it('rasm yoq bolsa olchanmaydi va mavzu tegilmaydi', async () => {
    show('clear', false);
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('light|light');
    expect(mockSample).not.toHaveBeenCalled();
  });

  /** Native'da o'lchov yo'q (null) - tanlov o'zgarmaydi. */
  it("o'lchab bo'lmasa mavzu tegilmaydi", async () => {
    mockSample.mockResolvedValue(null);
    show('clear');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('light|light');
  });
});
