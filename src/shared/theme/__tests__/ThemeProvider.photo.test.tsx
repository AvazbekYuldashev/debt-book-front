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
  peekPhoto: () => null,
}));

const photo = (r: number, g: number, b: number): PhotoSample => ({
  rows: 4,
  cols: 2,
  cells: Array.from({ length: 8 }, () => ({ r, g, b, a: 1 })),
});
const DARK_PHOTO = photo(58, 68, 84);
const BRIGHT_PHOTO = photo(236, 234, 228);

const MID_PHOTO = photo(150, 150, 150);

const Probe: React.FC<{ level: TransparencyLevel; image: boolean; preferred: 'light' | 'dark' }> = ({
  level,
  image,
  preferred,
}) => {
  const { activeTheme, mode, setMode, photoAdapted, photoAdaptedBy } = useAppTheme();
  const { setImage } = useBackground();
  const { setLevel } = useTransparency();

  // Bir marta: `setImage` har sozlama o'zgarishida yangi havola bo'ladi
  // va bog'liqlik ro'yxatida cheksiz tsikl yasardi.
  useEffect(() => {
    setMode(preferred);
    setLevel(level);
    if (image) setImage('photo-1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Text testID="theme">{`${activeTheme}|${mode}${photoAdapted ? '|adapted' : ''}`}</Text>
      <Text testID="reason">{String(photoAdaptedBy)}</Text>
    </>
  );
};

const show = (level: TransparencyLevel, image = true, preferred: 'light' | 'dark' = 'light') =>
  render(
    <BackgroundProvider>
      <TransparencyProvider>
        <AppThemeProvider>
          <Probe level={level} image={image} preferred={preferred} />
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

  /** Sozlamalardagi izoh to'g'ri sababni aytishi uchun - rasmning yorqinligi. */
  it("to'q rasmda sabab - rasm", async () => {
    show('clear');
    await settle();

    expect(screen.getByTestId('reason').props.children).toBe('photo');
  });

  /**
   * Qorong'i rejim + o'rtacha kulrang rasm: "O'rta" da tanlov saqlanadi,
   * to'liq shaffof "Ko'p" da esa yozuv to'q - sabab SHAFFOFLIK, rasm
   * "och" emas.
   */
  it("o'rtacha rasmda O'rta da tanlov saqlanadi", async () => {
    mockSample.mockResolvedValue(MID_PHOTO);
    show('medium', true, 'dark');
    await settle();
    expect(screen.getByTestId('theme').props.children).toBe('dark|dark');
    expect(screen.getByTestId('reason').props.children).toBe('null');
  });

  it("o'rtacha rasmda Ko'p da yozuv to'q, sabab shaffoflik", async () => {
    mockSample.mockResolvedValue(MID_PHOTO);
    show('clear', true, 'dark');
    await settle();
    expect(screen.getByTestId('theme').props.children).toBe('light|dark|adapted');
    expect(screen.getByTestId('reason').props.children).toBe('glass');
  });

  /** Tarmoq uzilsa: oldingi natija o'chmaydi, yangisi bo'lmasa - tanlov. */
  it("o'lchab bo'lmasa mavzu tegilmaydi", async () => {
    mockSample.mockResolvedValue(null);
    show('clear');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('light|light');
  });
});
