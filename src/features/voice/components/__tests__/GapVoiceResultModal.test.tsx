import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import GapVoiceResultModal from '../GapVoiceResultModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { VoiceGapMember } from '../../api/voice';
import type { GapVoiceCommand } from '../../model/resolveGapCommand';

const member = (over: Partial<VoiceGapMember> = {}): VoiceGapMember => ({
  memberId: 'a-1',
  memberName: 'Sardor Aliyev',
  groupId: 'kassa-1',
  groupName: 'Mahalla gap',
  unitCode: 'UZS',
  unitLabel: "so'm",
  unitType: 'MONEY',
  ...over,
});

const show = (command: GapVoiceCommand | null, onPick = jest.fn()) => {
  const screen = render(
    <AppThemeProvider>
      <LanguageProvider>
        <GapVoiceResultModal
          command={command}
          transcript="sardorga ellik ming berdim"
          onPickMember={onPick}
          onClose={jest.fn()}
        />
      </LanguageProvider>
    </AppThemeProvider>,
  );
  return { screen, onPick };
};

/**
 * Mavzu provayderi birinchi render'da bo'sh qaytadi - u saqlangan mavzuni
 * o'qiydi. "Yo'q" degan tekshiruvdan oldin kutish SHART, aks holda natija
 * kodga emas, kutmaganimizga bog'liq bo'lib qolardi.
 */
const settle = () =>
  act(async () => {
    await Promise.resolve();
  });

const twoSardors: GapVoiceCommand = {
  kind: 'CHOOSE_MEMBER',
  options: [
    member(),
    member({ memberId: 'a-2', groupId: 'kassa-2', groupName: 'Ish gap' }),
  ],
  prefill: { amount: 50000, direction: 'GAVE' },
};

describe('GapVoiceResultModal', () => {
  /**
   * Bir xil ismli ikki a'zoni faqat KASSA NOMI ajratadi. Usiz tanlov
   * ma'nosiz bo'lardi: ekranda bir xil ikki qator turardi.
   */
  it('bir xil ismlarni kassa nomi ajratadi', async () => {
    const { screen } = show(twoSardors);

    expect(await screen.findByText('Mahalla gap')).toBeTruthy();
    expect(screen.getByText('Ish gap')).toBeTruthy();
    expect(screen.getAllByText('Sardor Aliyev')).toHaveLength(2);
  });

  /** Tanlovni ODAM qiladi — bosilganda aynan o'sha a'zo qaytadi. */
  it('bosilgan a\'zo qaytariladi', async () => {
    const { screen, onPick } = show(twoSardors);
    await screen.findByText('Ish gap');

    fireEvent.press(screen.getByText('Ish gap'));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0].memberId).toBe('a-2');
  });

  /** Aytilgani ko'rinadi: dastur nimani eshitganini odam tekshira olsin. */
  it('eshitilgan gap ko\'rsatiladi', async () => {
    const { screen } = show(twoSardors);

    expect(await screen.findByText('sardorga ellik ming berdim')).toBeTruthy();
  });

  /**
   * A'zo ANIQ bo'lganda oyna umuman chiqmaydi — o'sha odamning ekrani
   * ochiladi va ortiqcha qadam bo'lmaydi.
   */
  it('aniq a\'zoda oyna ko\'rinmaydi', () => {
    const { screen } = show({
      kind: 'OPEN_MEMBER',
      member: member(),
      prefill: { amount: 50000 },
    });

    expect(screen.queryByText('Mahalla gap')).toBeNull();
  });

  it('buyruq yo\'q bo\'lsa hech narsa chizmaydi', () => {
    const { screen } = show(null);

    expect(screen.queryByText('sardorga ellik ming berdim')).toBeNull();
  });

  /** Topilmagan holatda tanlanadigan qator bo'lmaydi. */
  it('topilmaganda ro\'yxat chiqmaydi', async () => {
    const { screen } = show({ kind: 'NO_MEMBER', prefill: { amount: 50000 } });

    await screen.findByText('sardorga ellik ming berdim');
    expect(screen.queryByText('Sardor Aliyev')).toBeNull();
  });
});
