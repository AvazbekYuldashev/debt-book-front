export type BusinessRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface BusinessDTO {
  id: string;
  name: string;
  address: string;
  ownerId: string;
  ownerName: string;
  visible: boolean;
  createdDate: string;
  currentRole: BusinessRole;
}

export type BusinessMemberRole = Exclude<BusinessRole, 'OWNER'>;

export interface BusinessProfileDTO {
  id: string;
  businessId: string;
  profileId: string;
  // A'zolar ro'yxatiga egasi (OWNER) ham kiradi, shuning uchun to'liq BusinessRole.
  role: BusinessRole;
  profileName: string;
  profileUsername: string;
  phoneNumber: string;
  createdDate: string;
}

export interface BusinessCreateDTO {
  name: string;
  address: string;
}

export interface BusinessMemberCreateDTO {
  businessId: string;
  phoneNumber: string;
  role: BusinessMemberRole;
}

export interface WorkspaceState {
  mode: 'personal' | 'business';
  activeBusinessId: string | null;
  activeBusinessName: string | null;
  activeBusinessRole: BusinessRole | null;
}
