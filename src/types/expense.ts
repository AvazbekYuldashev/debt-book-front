export interface ExpenseResponseDTO {
  id: string;
  amount: number | string;
  description?: string;
  categoryId: string;
  createdDate?: string;
}

export interface ExpenseCreatedDTO {
  amount: number;
  description?: string;
  categoryId: string;
}

export interface ExpenseSumFilterDTO {
  categoryId: string;
  fromDate?: string;
  endDate?: string;
}

export interface ExpenseSumResponseDTO {
  categoryId: string;
  amount: number | string;
}
