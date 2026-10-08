import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import UsageDetailModal from '../UsageDetailModal';
import type { ModelPricing } from '../../model/spend';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import type { VoiceUsage } from '../../api/usage';
import type { VoiceCommand } from '../../model/voiceCommand';

/**
 * Bitta ovozli buyruq IKKI QISMDAN iborat: ovozni tanish va gapni
 * tushunish. Ro'yxatda ular bitta qator, bu yerda esa alohida.
 *
 * NEGA AJRATILADI: ular turlicha hisoblanadi - tanish daqiqaga, model
 * tokenga. Qaysi biri qimmatga tushayotganini bilish uchun yakuniy
 * raqam yetarli emas.
 */
const stt: VoiceUsage = {
  id: 'u1',
  createdDate: '2026-10-02T01:19:00',
  durationMs: 9000,
  cost: 69.3,
  ratePerMinute: 450,
  source: 'STT',
  promptTokens: 0,
  completionTokens: 0,
  sizeBytes: 135000,
  commandId: 'cmd-1',
};

const model: VoiceUsage = {
  id: 'u2',
  createdDate: '2026-10-02T01:19:30',
  durationMs: 0,
  cost: 0,
  ratePerMinute: 0,
  source: 'MODEL',
  promptTokens: 690,
  completionTokens: 47,
  sizeBytes: 0,
  commandId: 'cmd-1',
};

const command: VoiceCommand = {
  key: 'cmd-1',
  at: stt.createdDate,
  stt,
  model,
  cost: 69.3,
  target: null,
};

const show = (value: VoiceCommand | null, pricing: ModelPricing | null = null) =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <UsageDetailModal command={value} onClose={() => {}} pricing={pricing} />
      </LanguageProvider>
    </AppThemeProvider>,
  );

/** AppThemeProvider birinchi renderda null qaytaradi - uni tinchitamiz. */
const settle = () =>
  act(async () => {
    await Promise.resolve();
  });

describe('UsageDetailModal', () => {
  it('ikkala qism ham korsatiladi', async () => {
    show(command);
    await settle();

    expect(screen.getByText('9 soniya')).toBeTruthy();
    expect(screen.getByText('132 KB')).toBeTruthy();
  });

  /**
   * TOKEN SONI EMAS, NARX - va tafsilotsiz.
   *
   * Oynada tushunishning faqat UMUMIY narxi turadi: uni kirish va
   * chiqishga ajratish foydalanuvchiga hech narsa bermaydi, u bitta ovoz
   * uchun qancha to'laganini bilsa kifoya.
   *
   * 690 x $5 x 2 (ustama) / 1M x 12 000 = 82,80 so'm
   *  47 x $25 x 2 (ustama) / 1M x 12 000 = 28,20 so'm  -> jami 111 so'm
   */
  it('token soni emas, somdagi narxi korsatiladi', async () => {
    show(command, {
      // Server SOTUV tarifini beradi - ustama allaqachon ichida.
      inputPerMillion: 10,
      outputPerMillion: 50,
      usdRate: 12000,
      label: 'Claude Opus 5',
    });
    await settle();

    expect(screen.queryByText('690')).toBeNull();
    expect(screen.queryByText('47')).toBeNull();
    expect(screen.getByText("111 so'm")).toBeTruthy();
  });

  /**
   * Yakuniy raqam - ikkala qismning jami. U IKKI JOYDA turadi: tanish
   * qismining narxi va umumiy jami. Hozircha model bepul, shuning uchun
   * ular teng.
   */
  it('jami narx korsatiladi', async () => {
    show(command);
    await settle();

    expect(screen.getAllByText("69,30 so'm").length).toBeGreaterThan(0);
  });

  /** Model tarifi sozlanmaganda "0 so'm" emas - u "bepul" degan edi. */
  it('tarifsiz model narxi nol deb korsatilmaydi', async () => {
    show(command);
    await settle();

    expect(screen.queryByText("0 so'm")).toBeNull();
  });

  /**
   * Eski yozuvlarda buyruq belgisi yo'q va model qismi bo'lmasligi
   * mumkin - oyna shunda ham ochilishi kerak.
   */
  it('modelsiz buyruq ham ochiladi', async () => {
    show({ key: 'solo-u1', at: stt.createdDate, stt, model: null, cost: 69.3, target: null });
    await settle();

    expect(screen.getByText('9 soniya')).toBeTruthy();
    expect(screen.queryByText('690')).toBeNull();
  });

  it('buyruq yoq bolsa oyna ochilmaydi', async () => {
    show(null);
    await settle();

    expect(screen.queryByText('9 soniya')).toBeNull();
  });
});
