import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import SurfaceLabel from '../SurfaceLabel';
import { AppThemeProvider } from '../../theme';

/**
 * Fon ustidagi yorliq O'Z SIRTIDA turadi.
 *
 * Kontur bu holatda yetarli emas: ingichka oq chiziq to'q rasmda to'q
 * matnni qutqarmaydi. Sirt esa kafolat beradi.
 */
const show = (node: React.ReactElement) =>
  render(<AppThemeProvider>{node}</AppThemeProvider>);

const settle = () => act(async () => { await Promise.resolve(); });

/**
 * Matnni o'rab turgan SIRTni topadi.
 *
 * To'g'ridan-to'g'ri `.parent` ishonchsiz: render daraxtida matn bilan
 * sirt orasida oraliq tugunlar bo'lishi mumkin. Shuning uchun fon
 * rangiga ega birinchi ota qidiriladi.
 */
const surfaceOf = (node: any): Record<string, unknown> => {
  let current = node?.parent;
  while (current) {
    const style = StyleSheet.flatten(current.props?.style) as Record<string, unknown> | undefined;
    if (style?.backgroundColor) return style;
    current = current.parent;
  }
  return {};
};

describe('SurfaceLabel', () => {
  it('matn korsatiladi', async () => {
    show(<SurfaceLabel>Kontaktlar</SurfaceLabel>);
    await settle();

    expect(screen.getByText('Kontaktlar')).toBeTruthy();
  });

  it('matn fonli sirtda turadi', async () => {
    show(<SurfaceLabel>Kontaktlar</SurfaceLabel>);
    await settle();

    const style = surfaceOf(screen.getByText('Kontaktlar'));

    expect(style.backgroundColor).toBeTruthy();
    expect(style.borderRadius).toBeTruthy();
  });

  /** Kenglik MAZMUNGA qarab: cho'zilsa, yorliq emas, bo'sh panel bo'lardi. */
  it('kengligi mazmunga qarab', async () => {
    show(<SurfaceLabel>Kontaktlar</SurfaceLabel>);
    await settle();

    expect(surfaceOf(screen.getByText('Kontaktlar')).alignSelf).toBe('flex-start');
  });
});
