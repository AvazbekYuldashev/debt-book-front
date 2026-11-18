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
  /**
   * Xabar turi: `RENTAL_*` yoki pul xabarlarida yo'q.
   *
   * Bosilganda QAYERGA borishni shu hal qiladi — ijara xabari
   * kontakt kartasiga emas, yozuvning o'ziga olib borishi kerak.
   */
  kind?: string;
  /** Ijara xabari qaysi yozuvga tegishli. Kunlik xulosada bo'lmaydi. */
  rentalId?: string;
  read: boolean;
  createdDate: string;
}
