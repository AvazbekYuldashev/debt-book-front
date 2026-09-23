import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import VoiceNoticeModal from '../VoiceNoticeModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { VoiceError } from '../../model/useVoiceInput';

/**
 * Xato KO'RINISHI kerak.
 *
 * Ilgari u yuqori paneldagi tugma ostida kichik yozuv edi — qatorga
 * sig'masdi va ko'rinmay qolardi. Foydalanuvchi tugmani bosib, hech narsa
 * bo'lmaganini ko'rib, "brauzer ruxsat so'ramayapti" deb o'ylardi. Sabab
 * bor edi, faqat aytilmasdi.
 */

const renderNotice = (error: VoiceError | null) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <VoiceNoticeModal error={error} onClose={jest.fn()} />
      </LanguageProvider>
    </AppThemeProvider>,
  );

const settle = () =>
  act(async () => {
    await Promise.resolve();
  });

describe('VoiceNoticeModal', () => {
  it('xato yo\'q bo\'lsa chiqmaydi', async () => {
    renderNotice(null);
    await settle();
    expect(screen.queryByText('Mikrofonga ruxsat kerak')).toBeNull();
  });

  /** Bloklangan holatda "ruxsat bering" deyishning foydasi yo'q. */
  it('bloklangan mikrofon uchun ko\'rsatma beradi', async () => {
    renderNotice({ key: 'voice.permissionBlocked' });

    expect(await screen.findByText('Mikrofonga ruxsat kerak')).toBeTruthy();
    expect(screen.getByText(/bloklangan/)).toBeTruthy();
    expect(screen.getByText(/qulf belgisini bosing/)).toBeTruthy();
  });

  it('ruxsat berilmaganda ham ko\'rsatma chiqadi', async () => {
    renderNotice({ key: 'voice.permissionDenied' });

    expect(await screen.findByText('Mikrofonga ruxsat kerak')).toBeTruthy();
    expect(screen.getByText(/qulf belgisini bosing/)).toBeTruthy();
  });

  /** Server xabari allaqachon foydalanuvchi tilida — tarjima qilinmaydi. */
  it('server xabarini shundayligicha ko\'rsatadi', async () => {
    renderNotice({ message: "Ovoz xizmatida mablag' tugagan." });

    expect(await screen.findByText("Ovoz xizmatida mablag' tugagan.")).toBeTruthy();
    // Ruxsatga aloqasi yo'q — ko'rsatma ortiqcha bo'lardi.
    expect(screen.queryByText(/qulf belgisini bosing/)).toBeNull();
  });

  /**
   * Mikrofonsiz qurilmada "sozlamadan ruxsat bering" deyish odamni bekorga
   * sarson qilardi — u yerda ruxsatning aloqasi yo'q.
   */
  it("mikrofon yo'q qurilmada qulf ko'rsatmasi berilmaydi", async () => {
    renderNotice({ key: 'voice.noMicrophone' });

    expect(await screen.findByText('Mikrofon bilan muammo')).toBeTruthy();
    expect(screen.getByText(/mikrofon topilmadi/)).toBeTruthy();
    expect(screen.queryByText(/qulf belgisini bosing/)).toBeNull();
    expect(screen.queryByText('Mikrofonga ruxsat kerak')).toBeNull();
  });

  it('band mikrofon uchun boshqa maslahat beriladi', async () => {
    renderNotice({ key: 'voice.micBusy' });

    expect(await screen.findByText('Mikrofon bilan muammo')).toBeTruthy();
    expect(screen.getByText(/band/)).toBeTruthy();
  });

  it('oddiy xatoda ruxsat sarlavhasi chiqmaydi', async () => {
    renderNotice({ key: 'voice.notRecognised' });

    expect(await screen.findByText(/tanilmadi/)).toBeTruthy();
    expect(screen.queryByText('Mikrofonga ruxsat kerak')).toBeNull();
  });
});
