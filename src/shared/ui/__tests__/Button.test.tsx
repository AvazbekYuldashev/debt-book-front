import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Button from '../Button';
import { AppThemeProvider, useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';

/**
 * Umumiy tugma: rol va holat ekran o'quvchiga e'lon qilinadi, ikkinchi
 * darajali tugmalar shisha sirtda, qaytarib bo'lmaydigan amal esa xavf
 * rangida.
 */
let theme: ThemeValue | null = null;
const Probe: React.FC = () => {
  theme = useAppTheme();
  return null;
};

const show = (node: React.ReactElement) =>
  render(
    <AppThemeProvider>
      <Probe />
      {node}
    </AppThemeProvider>,
  );

/** AppThemeProvider birinchi renderda null qaytaradi - uni tinchitamiz. */
const settle = () => act(async () => { await Promise.resolve(); });

const boxOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
const textOf = (label: string) => StyleSheet.flatten(screen.getByText(label).props.style);

afterEach(() => {
  theme = null;
});

describe('Button', () => {
  it('tugma roli va nomi bilan e\'lon qilinadi, bosilganda chaqiriladi', async () => {
    const onPress = jest.fn();
    show(<Button title="Saqlash" onPress={onPress} />);
    await settle();

    const button = screen.getByRole('button', { name: 'Saqlash' });
    expect(button.props.accessibilityState).toEqual({ disabled: false, busy: false });

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('o\'chirilgan tugma bosilmaydi va holati e\'lon qilinadi', async () => {
    const onPress = jest.fn();
    show(<Button title="Saqlash" onPress={onPress} disabled />);
    await settle();

    const button = screen.getByRole('button', { name: 'Saqlash' });
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: false });

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  /** Yuklanayotganda matn o'rnida aylana - nom baribir qolishi SHART. */
  it('yuklanayotganda band, bosilmaydi va nomini yo\'qotmaydi', async () => {
    const onPress = jest.fn();
    show(<Button title="Saqlash" onPress={onPress} loading />);
    await settle();

    expect(screen.queryByText('Saqlash')).toBeNull();
    const button = screen.getByRole('button', { name: 'Saqlash' });
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  /** Fon rasmi ustida muzli shisha va "Shaffoflik" ga bo'ysunadi. */
  it('secondary/outline shisha sirtda, brend rangidagi kontur bilan', async () => {
    show(
      <>
        <Button title="Bekor qilish" variant="secondary" onPress={() => {}} />
        <Button title="Chiqish" variant="outline" onPress={() => {}} />
      </>,
    );
    await settle();
    const { colors, glass } = theme!;

    for (const name of ['Bekor qilish', 'Chiqish']) {
      const box = boxOf(name);
      expect(box.backgroundColor).toBe(glass.pane.backgroundColor);
      // Kontur pane'ning nozik chegarasidan KEYIN qo'yiladi - ko'rinadi.
      expect(box.borderWidth).toBe(1);
      expect(box.borderColor).toBe(colors.primary);
      expect(textOf(name).color).toBe(colors.primary);
    }
  });

  it('danger - xavf rangidagi kontur va yozuv', async () => {
    show(<Button title="Profilni o'chirish" variant="danger" onPress={() => {}} />);
    await settle();
    const { colors, glass } = theme!;

    const box = boxOf("Profilni o'chirish");
    expect(box.backgroundColor).toBe(glass.pane.backgroundColor);
    expect(box.borderWidth).toBe(1);
    expect(box.borderColor).toBe(colors.danger);
    expect(textOf("Profilni o'chirish").color).toBe(colors.danger);
  });

  it('soya mavzu tokenidan, qattiq qora emas', async () => {
    show(<Button title="Saqlash" onPress={() => {}} />);
    await settle();

    const box = boxOf('Saqlash');
    expect(box.shadowColor).toBe(theme!.shadows.card.shadowColor);
    // Qattiq fonli asosiy tugma Android'da ham soyasini yo'qotmaydi.
    expect(box.elevation).toBe(2);
  });

  /** Gap "Oldim/Berdim" va ConfirmDialog fonni `style` orqali almashtiradi. */
  it('chaqiruvchining style i oxirida qo\'llanadi', async () => {
    show(
      <Button
        title="Oldim"
        onPress={() => {}}
        style={{ backgroundColor: '#C4384B', borderWidth: 0 }}
      />,
    );
    await settle();

    const box = boxOf('Oldim');
    expect(box.backgroundColor).toBe('#C4384B');
    expect(box.borderWidth).toBe(0);
  });
});
