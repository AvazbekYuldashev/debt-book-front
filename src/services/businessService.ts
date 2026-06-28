import apiClient, { ApiClientError, setApiAuthToken } from '../api/apiClient';
import {
  BusinessCreateDTO,
  BusinessDTO,
  BusinessMemberCreateDTO,
  BusinessMemberRole,
  BusinessProfileDTO,
} from '../types/business';

export type AddMemberErrorCode =
  | 'PHONE_NOT_REGISTERED'
  | 'PHONE_NOT_VERIFIED'
  | 'ALREADY_MEMBER'
  | 'OWNER_NOT_ALLOWED'
  | 'BUSINESS_NOT_FOUND'
  | 'UNKNOWN';

export class AddBusinessMemberError extends Error {
  code: AddMemberErrorCode;
  status?: number;

  constructor(message: string, code: AddMemberErrorCode, status?: number) {
    super(message);
    this.name = 'AddBusinessMemberError';
    this.code = code;
    this.status = status;
  }
}

const ADD_MEMBER_MESSAGES: Record<AddMemberErrorCode, string> = {
  PHONE_NOT_REGISTERED: "Bu telefon raqam tizimda ro'yxatdan o'tmagan",
  PHONE_NOT_VERIFIED: "Profil tasdiqlanmagan yoki faol emas",
  ALREADY_MEMBER: "Bu profil allaqachon biznes a'zosi",
  OWNER_NOT_ALLOWED: 'OWNER roli faqat biznes yaratilganda beriladi',
  BUSINESS_NOT_FOUND: 'Biznes topilmadi',
  UNKNOWN: "A'zo qo'shib bo'lmadi",
};

const classifyAddMemberError = (e: ApiClientError): AddMemberErrorCode => {
  const msg = (e.message || '').toLowerCase();
  if (e.status === 404) return 'BUSINESS_NOT_FOUND';
  if (msg.includes('not registered')) return 'PHONE_NOT_REGISTERED';
  if (msg.includes('not verified') || msg.includes('not active')) return 'PHONE_NOT_VERIFIED';
  if (msg.includes('already a member')) return 'ALREADY_MEMBER';
  if (msg.includes('owner role')) return 'OWNER_NOT_ALLOWED';
  return 'UNKNOWN';
};

export const updateBusinessPhoto = async (businessId: string, photoId: string, token?: string): Promise<BusinessDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.put<BusinessDTO>(`/business/${businessId}/photo`, { photoId });
  return response.data;
};

export const getMyBusinesses = async (token?: string): Promise<BusinessDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<BusinessDTO[]>('/business/my');
  return response.data ?? [];
};

export const createBusiness = async (dto: BusinessCreateDTO, token?: string): Promise<BusinessDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.post<BusinessDTO>('/business', dto);
  return response.data;
};

export const getBusinessMembers = async (businessId: string, token?: string): Promise<BusinessProfileDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<BusinessProfileDTO[]>(`/business/${businessId}/members`);
  return response.data ?? [];
};

// Oldi-berdi uchun: biznes a'zolarini tanlash (a'zolik talab qilinmaydi)
export const getSelectableBusinessMembers = async (
  businessId: string,
  token?: string
): Promise<BusinessProfileDTO[]> => {
  setApiAuthToken(token);
  const response = await apiClient.get<BusinessProfileDTO[]>(`/business/${businessId}/members/selectable`);
  return response.data ?? [];
};

export const addBusinessMember = async (
  dto: BusinessMemberCreateDTO,
  token?: string
): Promise<BusinessProfileDTO> => {
  setApiAuthToken(token);
  try {
    const response = await apiClient.post<BusinessProfileDTO>('/business/member', dto);
    return response.data;
  } catch (e) {
    if (e instanceof ApiClientError) {
      const code = classifyAddMemberError(e);
      throw new AddBusinessMemberError(ADD_MEMBER_MESSAGES[code], code, e.status);
    }
    throw e;
  }
};

// Faqat OWNER: a'zoni biznesdan o'chirish
export const removeBusinessMember = async (
  businessId: string,
  profileId: string,
  token?: string
): Promise<void> => {
  setApiAuthToken(token);
  await apiClient.delete(`/business/${businessId}/members/${profileId}`);
};

// Faqat OWNER: a'zoning rolini o'zgartirish (ADMIN <-> MEMBER)
export const updateBusinessMemberRole = async (
  businessId: string,
  profileId: string,
  role: BusinessMemberRole,
  token?: string
): Promise<BusinessProfileDTO> => {
  setApiAuthToken(token);
  const response = await apiClient.put<BusinessProfileDTO>(
    `/business/${businessId}/members/${profileId}/role`,
    { role }
  );
  return response.data;
};
