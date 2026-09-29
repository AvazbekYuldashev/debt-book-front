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
export const createClickLink = async (amount: number): Promise<PaymentLink> => {
  const { data } = await apiClient.post<PaymentLink>('/payment/click/link', null, {
    params: { amount },
  });
  return data;
};
