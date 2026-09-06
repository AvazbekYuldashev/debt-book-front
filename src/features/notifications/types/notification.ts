/** Bitta ish maydonidagi o'qilmaganlar soni. businessId = null -> shaxsiy. */
export interface WorkspaceUnreadDTO {
  businessId: string | null;
  unreadCount: number;
}

export interface NotificationDTO {
  id: string;
  actorName?: string;
  actorPhone?: string;
  /** Bildirishnoma qaysi kontaktga tegishli: PROFILE yoki BUSINESS_ACCOUNT. */
  counterpartyType?: string;
  /** Profil id yoki biznes id. Eski yozuvlarda bo'lmaydi. */
  counterpartyId?: string;
  amount?: number;
  currency?: string;
  message: string;
  read: boolean;
  createdDate: string;
}
