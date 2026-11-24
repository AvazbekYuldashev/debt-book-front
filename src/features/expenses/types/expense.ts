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
  /**
   * Yozuv HALI SERVERGA YETMAGAN (oflaynda kiritilgan).
   *
   * Faqat qurilmada bo'ladi: server bunday maydon qaytarmaydi. Qatorda
   * soat belgisi bilan ko'rsatiladi va navbat yuborilgach haqiqiy
   * yozuvga almashadi.
   */
  pending?: boolean;
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
