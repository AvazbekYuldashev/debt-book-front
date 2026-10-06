import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MenuRow from '../MenuRow';
import { AppThemeProvider } from '../../theme';

/**
 * Menyu qatori: chapda rangsiz ikonka, yonida yozuv, o'ngda strelka.
 *
 * Ikonkaning RANGSIZ bo'lishi ataylab: rang ilovada ma'no tashiydi
 * (qarz qizil, haq yashil), menyuda esa ajratadigan ma'no yo'q.
 */
const show = (node: React.ReactElement) =>
  render(<AppThemeProvider>{node}</AppThemeProvider>);

/** AppThemeProvider birinchi renderda null qaytaradi - uni tinchitamiz. */
const settle = () => act(async () => { await Promise.resolve(); });

describe('MenuRow', () => {
  it('yorliq korsatiladi', async () => {
    show(<MenuRow label="Sozlamalar" icon="settings-outline" onPress={() => {}} />);
    await settle();

    expect(screen.getByText('Sozlamalar')).toBeTruthy();
  });

  it('bosilganda chaqiriladi', async () => {
    const onPress = jest.fn();
    show(<MenuRow label="Kontaktlar" icon="people-outline" onPress={onPress} />);
    await settle();

    fireEvent.press(screen.getByRole('button', { name: 'Kontaktlar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  /** O'chirilgan qator bosilmaydi - aks holda hech narsa qilmaydigan
      bosish "ishlamayapti" degan taassurot qoldirardi. */
  it('ochirilgan qator bosilmaydi', async () => {
    const onPress = jest.fn();
    show(<MenuRow label="Kontaktlar" icon="people-outline" onPress={onPress} disabled />);
    await settle();

    fireEvent.press(screen.getByRole('button', { name: 'Kontaktlar' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  /**
   * Web: klaviatura halqasi qatorning TASHQARISIDA. Qator padding'li
   * karta ichida turadi (kesilmaydi), ikonka va strelka esa uning
   * chetiga taqalgan - ichki halqa ularni kesib o'tardi.
   */
  it('fokus halqasi ichkariga olinmaydi', async () => {
    show(<MenuRow label="Kontaktlar" icon="people-outline" onPress={() => {}} />);
    await settle();

    expect(screen.getByRole('button', { name: 'Kontaktlar' }).props.dataSet).toBeUndefined();
  });

  /** O'ng chetga kalit yoki belgi qo'yish mumkin - o'shanda strelka yo'q. */
  it('ong chetdagi qism strelka ornini egallaydi', async () => {
    show(
      <MenuRow
        label="Tungi rejim"
        icon="moon-outline"
        onPress={() => {}}
        trailing={<Text>kalit</Text>}
      />,
    );
    await settle();

    expect(screen.getByText('kalit')).toBeTruthy();
  });
});
