import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { AppThemeProvider, useAppTheme } from '../ThemeProvider';
import { BackgroundProvider, useBackground } from '../BackgroundProvider';
import { TransparencyProvider, useTransparency } from '../TransparencyProvider';
import type { TransparencyLevel } from '../transparency';
import type { PhotoSample } from '../photoTone';

const mockSample = jest.fn<Promise<PhotoSample | null>, [string, string, number]>();
jest.mock('../photoColor', () => ({
  samplePhoto: (url: string, fit: string, aspect: number) => mockSample(url, fit, aspect),
}));

const photo = (r: number, g: number, b: number): PhotoSample => ({
  rows: 4,
  cols: 2,
  cells: Array.from({ length: 8 }, () => ({ r, g, b, a: 1 })),
});
const DARK_PHOTO = photo(58, 68, 84);
const BRIGHT_PHOTO = photo(236, 234, 228);

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
 * Yorug' rejim + to'q fon rasmi: yozuvlar oq (qorong'i ko'rinish), har
 * shaffoflik darajasida. Foydalanuvchi tanlovi (`mode`) esa saqlanadi.
 */
describe('AppThemeProvider - fon rasmi ustida', () => {
  beforeEach(() => {
    mockSample.mockReset();
    mockSample.mockResolvedValue(DARK_PHOTO);
  });

  it("to'q rasm -> oq yozuv (qorong'i ko'rinish), tanlov esa yorug'", async () => {
    show('clear');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('dark|light|adapted');
    expect(mockSample).toHaveBeenCalledWith(
      expect.stringContaining('/attach/open/photo-1'),
      'cover',
      expect.any(Number),
    );
  });

  /** Qoida shaffoflikka emas, FONGA bog'liq: "Kam" da ham yozuv oq. */
  it("Kam darajada ham to'q rasmda yozuv oq", async () => {
    show('solid');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('dark|light|adapted');
  });

  it("och rasmda yorug' rejim o'z holicha", async () => {
    mockSample.mockResolvedValue(BRIGHT_PHOTO);
    show('clear');
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
