import apiClient from '../../../shared/api/apiClient';

/** Bitta ovozli buyruqning sarfi. */
export interface VoiceUsage {
  id: string;
  createdDate: string;
  durationMs: number;
  cost: number;
  ratePerMinute: number;
  /** STT - ovozni tanish, MODEL - gapni tushunish. */
  source: 'STT' | 'MODEL';
  promptTokens: number;
  completionTokens: number;
  sizeBytes: number;
  /** Bitta ovozli buyruqning belgisi. Eski yozuvlarda bo'sh. */
  commandId?: string | null;
  /**
   * Ovoz YARATGAN yozuv - qatordagi strelka shunga olib boradi.
   *
   * `targetId` yozuvning emas, u YASHAYDIGAN EKRANNING belgisi: kontakt,
   * xarajat kategoriyasi yoki gap kassasi.
   *
   * Bo'sh bo'lishi mumkin: odam formani tasdiqlamagan yoki yozuv bu
   * imkoniyat paydo bo'lishidan oldin yaratilgan. Unda strelka yo'q.
   */
  targetType?: 'TRANSACTION' | 'EXPENSE' | 'GAP' | null;
  targetId?: string | null;
  targetLabel?: string | null;
}

/**
 * Sarf jamisi.
 *
 * Uch davr birga keladi: yolg'iz umumiy raqam o'sib boraveradi va undan
 * "ko'p sarflayapmanmi" degan savolga javob chiqmaydi.
 */
export interface VoiceUsageSummary {
  /** Tanish (STT) narxi - audio daqiqasiga. */
  today: number;
  thisMonth: number;
  total: number;
  /** Nechta ovoz aytilgani: pul yolg'iz turganda ma'nosi yarim. */
  countToday: number;
  countThisMonth: number;
  countTotal: number;
  ratePerMinute: number;
  /**
   * Yuqoridagi summaning TUSHUNISHGA ketgan ulushi.
   *
   * Qo'shimcha EMAS, ichidagi qism: narx yozilganda so'mga aylantirilib
   * saqlanadi, shuning uchun `today`/`thisMonth`/`total` allaqachon
   * ikkala xarajatni ham qamrab oladi. Qo'shsak ikki marta sanalardi.
   */
  modelToday: number;
  modelThisMonth: number;
  modelTotal: number;
  /** Tokenlar soni - tarif to'g'riligini tekshirish uchun. */
  tokensToday: number;
  tokensTotal: number;
  /** Qaysi model tarifi qo'llandi ("Claude Opus 5") va dollar kursi. */
  modelLabel?: string | null;
  usdRate?: number | null;
  /**
   * Tarifning o'zi - 1 million token uchun DOLLARDA.
   *
   * Bitta ovoz tafsilotida kirish va chiqish narxi alohida ko'rsatiladi:
   * qatorda faqat umumiy narx saqlanadi, uni ajratish uchun tarif kerak.
   */
  modelInputPerMillion?: number | null;
  modelOutputPerMillion?: number | null;
}

interface Paged<T> {
  content: T[];
  totalElements: number;
  last: boolean;
}

export const fetchVoiceUsage = async (page = 0, size = 20): Promise<Paged<VoiceUsage>> => {
  const { data } = await apiClient.get<Paged<VoiceUsage>>('/voice/usage', {
    params: { page, size },
  });
  return { content: data?.content ?? [], totalElements: data?.totalElements ?? 0, last: data?.last ?? true };
};

export const fetchVoiceUsageSummary = async (): Promise<VoiceUsageSummary> => {
  const { data } = await apiClient.get<VoiceUsageSummary>('/voice/usage/summary');
  return data;
};
