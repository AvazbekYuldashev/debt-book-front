export interface ExpenseResponseDTO {
  id: string;
  amount: number | string;
  description?: string;
  /** Summa kalkulyatorda hisoblangan bo'lsa — o'sha ifoda; alohida ustun. */
  calcNote?: string | null;
  categoryId: string;
  createdDate?: string;
  creatorId?: string;
  creatorPhone?: string;
}

export interface ExpenseCreatedDTO {
  amount: number;
  description?: string;
  /** Summa kalkulyatorda hisoblangan bo'lsa — o'sha ifoda. */
  calcNote?: string;
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
