import apiClient, { ApiClientError, setApiAuthToken } from '../api/apiClient';
import { ProfileResponseDTO } from '../types/profile';

const BASE_PATH = '/core/profile';

const buildPhoneCandidates = (phone: string): string[] => {
  const digits = phone.replace(/\D/g, '');
  const candidates = new Set<string>();

  if (!digits) return [];

  if (digits.length === 9) {
    candidates.add(`998${digits}`);
    candidates.add(`+998${digits}`);
    candidates.add(digits);
  } else if (digits.length === 12 && digits.startsWith('998')) {
    const local = digits.slice(3);
    candidates.add(digits);
    candidates.add(`+${digits}`);
    candidates.add(local);
  } else {
    candidates.add(digits);
    candidates.add(`+${digits}`);
  }

  return [...candidates];
};

export const getProfileByPhone = async (phone: string, token?: string): Promise<ProfileResponseDTO> => {
  setApiAuthToken(token);
  const phoneCandidates = buildPhoneCandidates(phone);
  let lastError: unknown;

  for (const candidate of phoneCandidates) {
    try {
      const response = await apiClient.get<ProfileResponseDTO>(`${BASE_PATH}/byPhone/${candidate}`);
      return response.data;
    } catch (e) {
      lastError = e;
      if (!(e instanceof ApiClientError) || e.status !== 404) {
        throw e;
      }
    }
  }

  throw lastError;
};
