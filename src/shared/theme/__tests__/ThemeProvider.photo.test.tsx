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
  const { activeTheme, mode, setMode } = useAppTheme();
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

  return <Text testID="theme">{`${activeTheme}|${mode}`}</Text>;
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
 * KO'RINISHNI FON RASMI AG'DARMAYDI.
 *
 * Ilgari ag'darardi: yorug' rejim + to'q rasm avtomatik oq yozuvli
 * (qorong'i) ko'rinishga o'tardi, o'qilsin deb. To'q rasm qo'yilganda esa
 * "Yorug'", "Tungi" va "Tizim" uchalasi bir xil chiqar, sozlama BUZUQ
 * bo'lib ko'rinardi - belgi ko'chardi, ekran o'zgarmasdi.
 *
 * Endi tanlov ustun. O'qilishni `photoFloor` ta'minlaydi: sirtning eng
 * kam tusi rasmga qarab ko'tariladi, ko'rinish esa tanlanganicha qoladi.
 *
 * Quyidagi testlar aynan shu kafolatni qo'riqlaydi - rasm qanday bo'lsa
 * ham, `activeTheme` tanlangan rejimga teng.
 */
describe('AppThemeProvider - fon rasmi ustida', () => {
  beforeEach(() => {
    mockSample.mockReset();
    mockSample.mockResolvedValue(DARK_PHOTO);
  });

  it("to'q rasm yorug' rejimni ag'darmaydi", async () => {
    show('clear');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('light|light');
    expect(mockSample).toHaveBeenCalledWith(
      expect.stringContaining('/attach/open/photo-1'),
      'cover',
      expect.any(Number),
    );
  });

  it("to'q rasm Kam shaffoflikda ham ag'darmaydi", async () => {
    show('solid');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('light|light');
  });

  it("och rasm qorong'i rejimni ag'darmaydi", async () => {
    mockSample.mockResolvedValue(BRIGHT_PHOTO);
    show('clear', true, 'dark');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('dark|dark');
  });

  /** Shaffoflik ham sabab emas: ilgari "Ko'p" da ko'rinish almashardi. */
  it("o'rtacha rasm Ko'p shaffoflikda ham ag'darmaydi", async () => {
    mockSample.mockResolvedValue(MID_PHOTO);
    show('clear', true, 'dark');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('dark|dark');
  });

  it("uch rejim uchun ham tanlov saqlanadi", async () => {
    for (const preferred of ['light', 'dark'] as const) {
      mockSample.mockResolvedValue(DARK_PHOTO);
      show('clear', true, preferred);
      await settle();
      expect(screen.getByTestId('theme').props.children).toBe(`${preferred}|${preferred}`);
      screen.unmount();
    }
  });

  it('rasm yoq bolsa olchanmaydi va mavzu tegilmaydi', async () => {
    show('clear', false);
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('light|light');
    expect(mockSample).not.toHaveBeenCalled();
  });

  /** Tarmoq uzilsa ham natija bir xil - tanlov baribir ustun. */
  it("o'lchab bo'lmasa ham tanlov saqlanadi", async () => {
    mockSample.mockResolvedValue(null);
    show('clear');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('light|light');
  });
});
