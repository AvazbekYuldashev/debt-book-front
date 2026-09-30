import apiClient from '../../../shared/api/apiClient';

/** Hisob holati. */
export interface PaymentSummary {
  balance: number;
  toppedUp: number;
  spent: number;
  /**
   * To'ldirish ishlaydimi.
   *
   * SERVERDAN keladi, mijozga yozib qo'yilmaydi: kalitlar ulangan kuni
   * ilovani qayta chiqarish kerak bo'lmasligi uchun.
   */
  clickEnabled: boolean;
}

/** To'ldirish tarixining bitta qatori. */
export interface PaymentHistory {
  id: string;
  createdDate: string;
  /** To'langan payt. Bekor qilinganda bo'sh. */
  paidDate: string | null;
  amount: number;
  status: 'PAID' | 'CANCELLED';
}

export interface PaymentLink {
  paymentId: string;
  amount: number;
  url: string;
}

export const fetchPaymentSummary = async (): Promise<PaymentSummary> => {
  const { data } = await apiClient.get<PaymentSummary>('/payment/summary');
  return data;
};

/**
 * To'lov havolasini so'raydi.
 *
 * Havolani SERVER yasaydi: unda merchant raqami va imzo sozlamalari
 * qatnashadi, ularni mijozga chiqarish mumkin emas.
 */
interface Paged<T> {
  content: T[];
}

export const fetchPaymentHistory = async (page = 0, size = 50): Promise<PaymentHistory[]> => {
  const { data } = await apiClient.get<Paged<PaymentHistory>>('/payment/history', {
    params: { page, size },
  });
  return data?.content ?? [];
};

export const createClickLink = async (amount: number): Promise<PaymentLink> => {
  const { data } = await apiClient.post<PaymentLink>('/payment/click/link', null, {
    params: { amount },
  });
  return data;
};
