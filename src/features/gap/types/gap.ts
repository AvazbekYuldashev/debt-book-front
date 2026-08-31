export type GapGroupStatus = 'DRAFT' | 'ACTIVE' | 'FINISHED' | 'STOPPED';

export type GapPaymentStatus = 'WAITING' | 'PAID' | 'CONFIRMED' | 'LATE' | 'DISPUTED';

/**
 * Badal nimada o'lchanadi.
 *  MONEY — pul (so'm, dollar, rubl)
 *  GOODS — mahsulot (kg go'sht, litr yog', metr mato, dona qo'y)
 * Birliklar bir-biriga AYLANTIRILMAYDI va hech qachon qo'shilmaydi.
 */
export type GapUnitType = 'MONEY' | 'GOODS';

/** Birlik: `code` — guruhlash kaliti, `label` — son yonida chiqadigan matn. */
export interface GapUnit {
  code: string;
  label: string;
  type: GapUnitType;
}

/** Filter holati. 'ALL' — odatiy: barcha birliklar ko'rinadi. */
export type GapUnitFilter = string | 'ALL';

export interface GapFilterDTO {
  unitCode?: string;
}

/** Bitta birlikdagi yig'indi: "500 000 so'm" yoki "35 kg go'sht". */
export interface GapAmountDTO {
  unitCode: string;
  unitLabel: string;
  unitType: GapUnitType;
  amount: number | string;
}

/**
 * Statistika paneli. Har bir raqam birlik bo'yicha ajratilgan ro'yxat —
 * so'm, dollar, kg go'sht bir-biriga qo'shilmaydi.
 * Ikkala "jami" ham QOLGAN majburiyat, o'tgan davrlar emas.
 */
export interface GapSummaryDTO {
  currentMonthReceive: GapAmountDTO[];
  totalReceive: GapAmountDTO[];
  currentMonthPay: GapAmountDTO[];
  totalPay: GapAmountDTO[];
}

/** Ro'yxatdagi bitta gap kassa qatori. */
export interface GapResponseDTO {
  id: string;
  name: string;
  amount: number | string;
  unitCode: string;
  unitLabel: string;
  unitType: GapUnitType;
  status: GapGroupStatus;
  queueMode: 'UPFRONT' | 'MONTHLY';
  /** Joriy foydalanuvchi tashkilotchimi — navbat tugmalari faqat unga. */
  organizer: boolean;
  currentPeriod: number;
  totalPeriods: number;
  myQueuePosition: number | null;
  myTurnDate: string | null;
  nextPaymentDate: string | null;
  /** Shu guruhda jami olganim (tasdiqlangan to'lovlar). */
  myTotalReceived: number | string;
  /** Shu guruhda jami berganim (tasdiqlangan to'lovlar). */
  myTotalGiven: number | string;
}

/** A'zolar ro'yxatidagi bitta qator. */
export interface GapMemberDTO {
  shareId: string;
  memberName: string;
  memberPhone: string | null;
  queuePosition: number;
  turnDate: string | null;
  me: boolean;
  receiverThisPeriod: boolean;
  received: number | string;
  paid: number | string;
  openRisk: number | string;
  currentPeriodStatus: GapPaymentStatus | null;
  /** Shu davrda to'lashi kerak bo'lgan miqdor. Shu oy oluvchida null. */
  currentPeriodAmount: number | string | null;
}

/** Ikki a'zo o'rtasidagi bitta to'lov yozuvi. */
export interface GapTransferDTO {
  paymentId: string;
  periodNumber: number | null;
  dueDate: string | null;
  counterpartyShareId: string | null;
  counterpartyName: string | null;
  counterpartyPhone: string | null;
  /** Qarama-qarshi tomon joriy foydalanuvchimi. */
  counterpartyMe: boolean;
  amount: number | string;
  status: GapPaymentStatus | null;
  confirmed: boolean;
  /** Davr yopilgan bo'lsa bu yozuv bilan hech qanday amal qilinmaydi. */
  periodClosed: boolean;
}

/** Bitta a'zoning shaxsiy hisob-kitobi. */
export interface GapShareDetailDTO {
  shareId: string;
  groupId: string;
  groupName: string;
  unitCode: string;
  unitLabel: string;
  unitType: GapUnitType;
  memberName: string;
  memberPhone: string | null;
  queuePosition: number;
  me: boolean;
  totalReceived: number | string;
  totalGiven: number | string;
  /** Unga kim qancha bergan */
  incoming: GapTransferDTO[];
  /** U kimga qancha bergan */
  outgoing: GapTransferDTO[];
}

/** Backend BigDecimal'ni ba'zan satr sifatida qaytaradi — normallashtiramiz. */
export const toAmount = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

/** Birlik maydonlari tarqoq keladigan obyektlardan yagona `GapUnit` yasaydi. */
export const unitOf = (source: {
  unitCode: string;
  unitLabel: string;
  unitType: GapUnitType;
}): GapUnit => ({
  code: source.unitCode,
  label: source.unitLabel,
  type: source.unitType,
});

/** Statistika panelidagi qaysi raqam bo'yicha saralanmoqda. */
export type GapSortDirection = 'receive' | 'pay';

export interface GapSort {
  direction: GapSortDirection;
  unitCode: string;
}
