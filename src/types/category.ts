export interface CategoryResponseDTO {
  id: string;
  name: string;
  pin?: boolean;
  visible?: boolean;
  createdDate?: string;
  creatorId?: string;
}

export interface CategoryCreatedDTO {
  name: string;
}

export interface CategoryUpdateDTO {
  id: string;
  name: string;
}

export interface CategoryPinDTO {
  id: string;
  pin: boolean;
}
