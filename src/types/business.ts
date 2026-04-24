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

export interface BusinessProfileDTO {
  id: string;
  businessId: string;
  profileId: string;
  role: 'ADMIN' | 'MEMBER';
  profileName: string;
  profileUsername: string;
  createdDate: string;
}

export interface BusinessCreateDTO {
  name: string;
  address: string;
}

export interface BusinessMemberCreateDTO {
  businessId: string;
  profileId: string;
  role: 'ADMIN' | 'MEMBER';
}

export interface WorkspaceState {
  mode: 'personal' | 'business';
  activeBusinessId: string | null;
  activeBusinessName: string | null;
  activeBusinessRole: BusinessRole | null;
}
