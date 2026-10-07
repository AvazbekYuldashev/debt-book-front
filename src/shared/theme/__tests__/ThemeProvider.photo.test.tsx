import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { AppThemeProvider, useAppTheme } from '../ThemeProvider';
import { BackgroundProvider, useBackground } from '../BackgroundProvider';
import { TransparencyProvider, useTransparency } from '../TransparencyProvider';
import type { TransparencyLevel } from '../transparency';

const Probe: React.FC<{ level: TransparencyLevel; image: boolean; preferred: 'light' | 'dark' }> = ({
  level,
  image,
  preferred,
}) => {
  const { activeTheme, mode, setMode, glass } = useAppTheme();
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
      <Text testID="theme">{`${activeTheme}|${mode}`}</Text>
      <Text testID="surface">{String(glass.surface.backgroundColor)}</Text>
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
 * FON RASMI KO'RINISHGA HAM, SIRTLARGA HAM TEGMAYDI.
 *
 * Ikkalasi ham bir vaqtda tegardi va ikkalasi ham rad etildi:
 *
 *   1. Ko'rinish: yorug' rejim + to'q rasm avtomatik qorong'iga
 *      ag'darilardi. To'q rasm qo'yilganda "Yorug'", "Tungi" va "Tizim"
 *      uchalasi bir xil chiqib, sozlama BUZUQ bo'lib ko'rinardi.
 *
 *   2. Sirtlar: rasm ustida alohida alfa jadvali, muzlatish va oq xiralik
 *      ishlardi - rasm qo'yilgan ilova sut rangli va so'nik ko'rinardi.
 *
 * Endi rasm faqat FON sifatida chiziladi. Quyidagi testlar shuni
 * qo'riqlaydi: rasm qo'yilgani bilan na mavzu, na shisha o'zgaradi.
 */
describe('AppThemeProvider - fon rasmi', () => {
  it('rasm yorug rejimni agdarmaydi', async () => {
    show('clear');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('light|light');
  });

  it('rasm qorongi rejimni agdarmaydi', async () => {
    show('clear', true, 'dark');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('dark|dark');
  });

  it('rasm Kam shaffoflikda ham agdarmaydi', async () => {
    show('solid');
    await settle();

    expect(screen.getByTestId('theme').props.children).toBe('light|light');
  });

  /** Ekranda ko'rinadigan asosiy farq shu edi - sirt rangi. */
  it('rasmli va rasmsiz sirt rangi bir xil', async () => {
    for (const level of ['clear', 'medium', 'solid'] as const) {
      show(level, true);
      await settle();
      const rasmda = screen.getByTestId('surface').props.children;
      screen.unmount();

      show(level, false);
      await settle();
      expect([level, screen.getByTestId('surface').props.children]).toEqual([level, rasmda]);
      screen.unmount();
    }
  });
});
