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
}

/**
 * Sarf jamisi.
 *
 * Uch davr birga keladi: yolg'iz umumiy raqam o'sib boraveradi va undan
 * "ko'p sarflayapmanmi" degan savolga javob chiqmaydi.
 */
export interface VoiceUsageSummary {
  today: number;
  thisMonth: number;
  total: number;
  countToday: number;
  countTotal: number;
  ratePerMinute: number;
  /**
   * Gapni tushunishga ketgan tokenlar.
   *
   * Summadan ALOHIDA, chunki boshqa o'lchov: tanish daqiqasiga, model
   * tokenga to'lanadi. Bitta raqamga qo'shsak ikki xil narsa aralashardi.
   */
  tokensToday: number;
  tokensTotal: number;
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
