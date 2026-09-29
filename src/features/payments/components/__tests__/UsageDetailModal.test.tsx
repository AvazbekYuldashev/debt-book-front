import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import UsageDetailModal from '../UsageDetailModal';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { VoiceUsage } from '../../api/usage';

/**
 * Batafsil oyna IKKI XIL yozuvni ko'rsatadi.
 *
 * Ovoz tanish daqiqaga to'lanadi, model esa tokenga - shuning uchun
 * maydonlari ham boshqa. Bir xil jadvalga tiqishtirsak, yarmi bo'sh
 * qatorlar chiqib o'qish qiyinlashardi.
 */
const base: VoiceUsage = {
  id: 'u1',
  createdDate: '2026-09-30T01:04:00',
  durationMs: 5880,
  cost: 44.1,
  ratePerMinute: 450,
  source: 'STT',
  promptTokens: 0,
  completionTokens: 0,
  sizeBytes: 88000,
};

const show = (usage: VoiceUsage | null) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <UsageDetailModal usage={usage} onClose={() => {}} />
      </LanguageProvider>
    </AppThemeProvider>,
  );

/**
 * AppThemeProvider birinchi renderda null qaytaradi (shrift va mavzu
 * kutiladi), shuning uchun tekshirishdan oldin uni "tinchitish" kerak.
 */
const settle = () =>
  act(async () => {
    await Promise.resolve();
  });

describe('UsageDetailModal', () => {
  it('ovoz tanishda davomiylik va tarif', async () => {
    show(base);
    await settle();

    expect(screen.getByText('6 soniya')).toBeTruthy();
    expect(screen.getByText('86 KB')).toBeTruthy();
    expect(screen.getByText("44,10 so'm")).toBeTruthy();
  });

  /** Foydalanuvchi so'ragani: kirish va chiqish tokenlari ALOHIDA. */
  it('modelda kirish va chiqish tokenlari alohida', async () => {
    show({
      ...base,
      source: 'MODEL',
      promptTokens: 1240,
      completionTokens: 47,
      cost: 0,
      durationMs: 0,
    });
    await settle();

    expect(screen.getByText('1 240')).toBeTruthy();
    expect(screen.getByText('47')).toBeTruthy();
    expect(screen.getByText('1 287')).toBeTruthy();
  });

  /** Tarif sozlanmaganda "0 so'm" emas - u "bepul" degan taassurot qoldirardi. */
  it('tarifsiz model narxi nol deb korsatilmaydi', async () => {
    show({ ...base, source: 'MODEL', promptTokens: 10, completionTokens: 5, cost: 0 });
    await settle();

    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.queryByText("0 so'm")).toBeNull();
  });

  it('yozuv yoq bolsa oyna ochilmaydi', async () => {
    show(null);
    await settle();

    expect(screen.queryByText('Ovozni tanish')).toBeNull();
    expect(screen.queryByText('Gapni tushunish')).toBeNull();
  });
});
