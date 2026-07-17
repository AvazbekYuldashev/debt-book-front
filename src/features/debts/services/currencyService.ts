import apiClient, { setApiAuthToken } from '../../../shared/api/apiClient';
import { CurrencyRatesDTO } from '../../../shared/types/money';

// Markaziy bank (CBU) kurslari — backend orqali (kesh + CORSsiz).
export const getCurrencyRates = async (token?: string): Promise<CurrencyRatesDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.get<CurrencyRatesDTO>('/core/currency/rates');
  return response.data;
};
