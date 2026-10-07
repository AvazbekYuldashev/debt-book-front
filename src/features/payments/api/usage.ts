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
   * Gapni TUSHUNISHGA ketgan tokenlarning so'mdagi narxi.
   *
   * Serverda hisoblanadi: model tarifi (dollarda, 1 million tokenga) va
   * Markaziy bankning jonli dollar kursi. Ilovada hisoblanmaydi - aks
   * holda eski o'rnatilgan nusxalar eskirgan raqam ko'rsatardi.
   *
   * NULL - tarif yoki kurs yo'q, ya'ni "hisoblab bo'lmadi". Nol bilan
   * adashtirmaslik kerak: nol "bepul" degani.
   */
  modelToday: number | null;
  modelThisMonth: number | null;
  modelTotal: number | null;
  /** Tokenlar soni - tarif to'g'riligini tekshirish uchun. */
  tokensToday: number;
  tokensTotal: number;
  /** Qaysi model tarifi qo'llandi ("Claude Opus 5") va dollar kursi. */
  modelLabel?: string | null;
  usdRate?: number | null;
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
