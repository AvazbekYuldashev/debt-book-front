import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import VoiceResultModal from '../VoiceResultModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { VoiceCommand } from '../../model/resolveVoiceCommand';

/**
 * Ovozli buyruq to'liq tushunilmaganda chiqadigan oyna.
 *
 * Asosiy talab: dastur taxmin qilmaydi, TANLOVNI ODAM QILADI. Ikkita Ali
 * mos kelganda birinchisini olish — qarzni begona yozuvga yozish demak.
 */

const renderModal = (
  command: VoiceCommand | null,
  props: Partial<React.ComponentProps<typeof VoiceResultModal>> = {},
) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <VoiceResultModal
          command={command}
          transcript="aliga ellik ming berdim"
          options={[]}
          onPickContact={jest.fn()}
          onPickDirection={jest.fn()}
          onClose={jest.fn()}
          {...props}
        />
      </LanguageProvider>
    </AppThemeProvider>,
  );

/**
 * Mavzu provayderi birinchi render'da bo'sh qaytadi — u saqlangan mavzuni
 * o'qiydi. Shuning uchun "yo'q" degan tekshiruvdan oldin kutish SHART, aks
 * holda natija kodga emas, kutmaganimizga bog'liq bo'lib qolardi.
 */
const settle = () =>
  act(async () => {
    await Promise.resolve();
  });

describe('VoiceResultModal', () => {
  it("hammasi aniq bo'lganda oyna chiqmaydi", async () => {
    // OPEN_CONTACT da to'g'ridan-to'g'ri kontaktga o'tiladi — ortiqcha
    // qadam qo'ymaymiz.
    renderModal({
      kind: 'OPEN_CONTACT',
      contactId: 'c1',
      prefill: { amount: 50000, direction: 'GAVE' },
    });
    await settle();

    expect(screen.queryByText('Ovozli buyruq')).toBeNull();
  });

  it("aytilgan gap ko'rsatiladi", async () => {
    renderModal({ kind: 'NO_CONTACT', prefill: {} });

    expect(await screen.findByText('Eshitganim')).toBeTruthy();
    expect(screen.getByText('aliga ellik ming berdim')).toBeTruthy();
  });

  it('odam topilmaganda sabab aytiladi', async () => {
    renderModal({ kind: 'NO_CONTACT', prefill: {} });

    expect(await screen.findByText(/kontaktlaringizda topilmadi/)).toBeTruthy();
  });

  it('bir nechta odamdan tanlash taklif qilinadi', async () => {
    const onPickContact = jest.fn();
    renderModal(
      { kind: 'CHOOSE_CONTACT', prefill: { amount: 50000 } },
      {
        options: [
          { id: 'c1', name: 'Ali Valiyev' },
          { id: 'c2', name: 'Ali Karimov' },
        ],
        onPickContact,
      },
    );

    expect(await screen.findByText('Ali Valiyev')).toBeTruthy();
    expect(screen.getByText('Ali Karimov')).toBeTruthy();

    fireEvent.press(screen.getByText('Ali Karimov'));
    expect(onPickContact).toHaveBeenCalledWith('c2');
  });

  it("yo'nalish noma'lum bo'lsa ikkala tugma chiqadi", async () => {
    const onPickDirection = jest.fn();
    renderModal(
      { kind: 'ASK_DIRECTION', contactId: 'c1', prefill: { amount: 50000 } },
      { onPickDirection },
    );

    expect(await screen.findByText('Berdingizmi yoki oldingizmi?')).toBeTruthy();

    fireEvent.press(screen.getByText('Berdim'));
    expect(onPickDirection).toHaveBeenCalledWith('GAVE');

    fireEvent.press(screen.getByText('Oldim'));
    expect(onPickDirection).toHaveBeenCalledWith('TOOK');
  });

  it("buyruq yo'q bo'lsa hech narsa chizilmaydi", async () => {
    renderModal(null);
    await settle();

    expect(screen.queryByText('Ovozli buyruq')).toBeNull();
  });
});
