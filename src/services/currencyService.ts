import apiClient, { setApiAuthToken } from '../api/apiClient';
import { CurrencyRatesDTO } from '../types/money';

// Markaziy bank (CBU) kurslari — backend orqali (kesh + CORSsiz).
export const getCurrencyRates = async (token?: string): Promise<CurrencyRatesDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<CurrencyRatesDTO>('/core/currency/rates');
  return response.data;
};
