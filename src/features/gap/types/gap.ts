// ============================================================
//  Gap kassa (aylanma jamg'arma) tiplari.
//
//  MUHIM: bu modulda hech qanday to'lov tizimi ishtirok etmaydi
//  (Click / Payme / bank emas). Pul a'zolar o'rtasida ilova
//  tashqarisida harakatlanadi; ilova faqat "kim kimga qancha
//  berdi va qachon berdi" faktini qayd etadi.
//
//  Tiplar backend DTO'lariga bir-bir mos keladi.
// ============================================================

import type { Currency } from '../../../shared/types/money';

export type GapGroupStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
export type GapMemberStatus = 'ACTIVE' | 'LEFT' | 'REPLACED';
export type GapQueueOrderType = 'MANUAL' | 'RANDOM';

/** Navbat qanday aniqlanadi: bir marta yoki har davr oldidan. */
export type GapQueueMode = 'FIXED' | 'PER_ROUND';
/** Kimdir to'lamay qolganda: kutish / bor summani berish / tashkilotchi qoplashi. */
export type GapUnpaidRule = 'WAIT' | 'PARTIAL' | 'COVER';
export type GapRoundStatus =
  | 'SCHEDULED'
  | 'COLLECTING'
  | 'READY_FOR_PAYOUT'
  | 'PAID'
  | 'CLOSED'
  | 'DISPUTED';
export type GapContributionStatus =
  | 'PENDING'
  | 'DECLARED'
  | 'CONFIRMED'
  | 'LATE'
  | 'DISPUTED'
  | 'WAIVED';
export type GapPayoutStatus = 'PENDING' | 'DECLARED' | 'CONFIRMED';
export type GapDisputeStatus = 'OPEN' | 'RESOLVED' | 'REJECTED';
export type GapDisputeResolution = 'CONFIRM_CONTRIBUTION' | 'REJECT_CONTRIBUTION';

// ------------------------------------------------------------ guruh --

export interface GapGroupResponseDTO {
  id: string;
  name: string;
  organizerProfileId: string;
  /** Server hisoblaydi: so'rov yuborgan odam tashkilotchimi. */
  organizer?: boolean;
  organizerName?: string;
  contributionAmount: number;
  currency: Currency;
  payoutDay: number;
  /** Ulushlar soni = sikl uzunligi (oy). Odamlar soni EMAS. */
  totalShares: number;
  startDate?: string;
  status: GapGroupStatus;
  queueOrderType?: GapQueueOrderType;
  /** Navbat bir marta tashlanadimi (FIXED) yoki har davr oldidan (PER_ROUND). */
  queueMode?: GapQueueMode;
  /** Badal birligi: "kg go'sht". Bo'sh bo'lsa oddiy pul kassasi. */
  unitLabel?: string;
  queueSealedDate?: string;
  unpaidRule: GapUnpaidRule;
  guarantorRequired?: boolean;
  /** Bir kassa summasi = badal x (ulushlar soni - 1). */
  payoutAmount: number;
  cycleLengthMonths: number;
  /** Sikl qaysi sanada yakunlanadi. */
  endDate?: string;
  /** Biriktirilgan ulushlar soni (DRAFT'da totalShares'dan kam bo'lishi mumkin). */
  assignedShares?: number;
  createdDate?: string;
}

export interface GapGroupCreateDTO {
  name: string;
  contributionAmount: number;
  currency?: Currency;
  payoutDay: number;
  totalShares: number;
  startDate?: string;
  unpaidRule?: GapUnpaidRule;
  guarantorRequired?: boolean;
  /** Navbat rejimi. Berilmasa har davr oldidan qur'a tashlanadi. */
  queueMode?: GapQueueMode;
  /** Badal birligi: "kg go'sht", "litr yog'". */
  unitLabel?: string;
  /** FIXED rejimida: qur'a (RANDOM) yoki kelishuv (MANUAL). */
  queueOrderType?: GapQueueOrderType;
}

// ------------------------------------------------------- a'zo, ulush --

export interface GapShareResponseDTO {
  id: string;
  shareNo: number;
  queuePosition?: number;
  memberId: string;
  memberName?: string;
  memberPhone?: string;
  /** Navbat boshidagi kafilsiz a'zo — guruh uchun xavf. */
  riskWarning?: boolean;
  riskNote?: string;
}

export interface GapMemberResponseDTO {
  id: string;
  groupId: string;
  profileId?: string;
  name: string;
  phone: string;
  status: GapMemberStatus;
  guarantorMemberId?: string;
  guarantorName?: string;
  joinedDate?: string;
  shares?: GapShareResponseDTO[];
}

export interface GapMemberCreateDTO {
  name: string;
  phone: string;
  /** Bir odam ikki ulush olishi mumkin — u holda ikki barobar to'laydi. */
  shareCount?: number;
  guarantorMemberId?: string;
}

export interface GapShareBalanceDTO {
  shareId: string;
  shareNo: number;
  queuePosition?: number;
  memberId: string;
  memberName?: string;
  memberPhone?: string;
  paidAmount: number;
  receivedAmount: number;
  /** Jami majburiyat = badal x (ulushlar soni - 1). */
  totalObligation?: number;
  /** Hali to'lanmagan qism. */
  remainingAmount?: number;
  paidRounds?: number;
  remainingRounds?: number;
  /** OCHIQ XAVF = olgan - to'lagan. Musbat bo'lsa a'zo guruhga qarzdor. */
  openRisk: number;
}

// ------------------------------------------------------ navbat, davr --

export interface GapQueueAssignDTO {
  orderType: GapQueueOrderType;
  /** MANUAL uchun: ulush id'lari navbat tartibida. RANDOM'da e'tiborga olinmaydi. */
  shareIdsInOrder?: string[];
}

/**
 * Keyingi davr oluvchisini belgilash.
 *
 * Navbat oxirigacha oldindan qotib qolmaydi: kim keyingi ekani har safar
 * oldingi davr yopilgach hal qilinadi.
 */
export interface GapQueueNextDTO {
  orderType: GapQueueOrderType;
  /** MANUAL uchun majburiy — keyingi kassani oladigan ulush. */
  shareId?: string;
}

export interface GapSwapRequestDTO {
  requesterShareId: string;
  targetShareId: string;
}

export type GapSwapStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface GapSwapResponseDTO {
  id: string;
  groupId: string;
  requesterShareId: string;
  requesterName?: string;
  requesterPosition?: number;
  targetShareId: string;
  targetName?: string;
  targetPosition?: number;
  status: GapSwapStatus;
  requestedByProfileId: string;
  createdDate?: string;
  /** Serverda hisoblanadi: javob berish huquqi faqat taklif qilingan tomonda. */
  canRespond?: boolean;
  /** So'rovni joriy foydalanuvchi yuborganmi. */
  mine?: boolean;
}

export interface GapRoundResponseDTO {
  id: string;
  groupId: string;
  roundNo: number;
  dueDate: string;
  recipientShareId?: string;
  recipientMemberId?: string;
  recipientName?: string;
  expectedAmount: number;
  collectedAmount: number;
  /** "To'ladim" deyilgan, lekin hali tasdiqlanmagan summa. */
  declaredAmount?: number;
  paidOutAmount?: number;
  status: GapRoundStatus;
  /** Oluvchisi ataylab tanlanganmi. False bo'lsa davrni ochib bo'lmaydi. */
  recipientChosen?: boolean;
  /** Ekrandagi "17 / 19" ko'rinishi uchun. */
  confirmedCount?: number;
  expectedCount?: number;
  openedDate?: string;
  closedDate?: string;
}

export interface GapContributionResponseDTO {
  id: string;
  roundId: string;
  roundNo?: number;
  shareId: string;
  shareNo?: number;
  queuePosition?: number;
  memberId?: string;
  memberName?: string;
  memberPhone?: string;
  /**
   * Badal KIMGA tegishli — o'sha davrda kassani oluvchi.
   * "Men kimga to'ladim" degan savolga javob shu maydon.
   */
  recipientShareId?: string;
  recipientName?: string;
  /** Kutilayotgan summa (guruh badali). */
  amount: number;
  /** Haqiqatda to'langan summa — qisman to'lovda badaldan kam bo'lishi mumkin. */
  paidAmount?: number;
  status: GapContributionStatus;
  declaredDate?: string;
  confirmedDate?: string;
}

export interface GapPayoutResponseDTO {
  id: string;
  roundId: string;
  roundNo?: number;
  sequenceNo: number;
  recipientShareId: string;
  recipientMemberId?: string;
  recipientName?: string;
  amount: number;
  roundPaidTotal?: number;
  roundExpectedAmount?: number;
  status: GapPayoutStatus;
  releasedDate?: string;
  confirmedDate?: string;
}

export interface GapPayoutReleaseDTO {
  /** Berilmasa qoidaga qarab maksimal mumkin bo'lgan summa beriladi. */
  amount?: number;
}

// ------------------------------------------- mening ekranim, hisobot --

/** TZ 12-bo'lim: a'zoning asosiy ekrani uchun yig'ma javob. */
export interface GapMyDashboardDTO {
  group: GapGroupResponseDTO;
  myShares: GapShareBalanceDTO[];
  currentRound?: GapRoundResponseDTO;
  /** Joriy davrda mening hali yopilmagan badallarim. */
  myOpenContributions: GapContributionResponseDTO[];
  recipientThisRound?: boolean;
  organizer?: boolean;
}

/** Sikl o'rtasida to'xtaganda: kim kimga qancha qaytarishi kerak. */
export interface GapSettlementDTO {
  groupId: string;
  groupName: string;
  currency?: string;
  closedRounds?: number;
  totalRounds?: number;
  debtors: GapShareBalanceDTO[];
  creditors: GapShareBalanceDTO[];
  settled: GapShareBalanceDTO[];
  totalOwedToGroup: number;
  totalOwedByGroup: number;
}

// ------------------------------------------------------ nizo, tarix --

export interface GapDisputeCreateDTO {
  contributionId: string;
  reason: string;
}

export interface GapDisputeResolveDTO {
  resolution: GapDisputeResolution;
  resolutionNote?: string;
}

export interface GapDisputeResponseDTO {
  id: string;
  groupId: string;
  roundId?: string;
  roundNo?: number;
  contributionId?: string;
  contributionAmount?: number;
  memberId?: string;
  memberName?: string;
  raisedByProfileId: string;
  reason?: string;
  status: GapDisputeStatus;
  resolvedByProfileId?: string;
  resolutionNote?: string;
  resolvedDate?: string;
  createdDate?: string;
}

export type GapAuditAction =
  | 'GROUP_CREATED'
  | 'GROUP_UPDATED'
  | 'GROUP_ACTIVATED'
  | 'GROUP_TERMINATED'
  | 'GROUP_COMPLETED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_REPLACED'
  | 'GUARANTOR_ASSIGNED'
  | 'QUEUE_ASSIGNED'
  | 'QUEUE_SWAP_REQUESTED'
  | 'QUEUE_SWAP_ACCEPTED'
  | 'QUEUE_SWAP_REJECTED'
  | 'ROUND_OPENED'
  | 'ROUND_CLOSED'
  | 'CONTRIBUTION_DECLARED'
  | 'CONTRIBUTION_CONFIRMED'
  | 'CONTRIBUTION_MARKED_LATE'
  | 'PAYOUT_RELEASED'
  | 'PAYOUT_CONFIRMED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED';

export interface GapAuditResponseDTO {
  id: string;
  action: GapAuditAction;
  /** Backend Accept-Language bo'yicha render qiladi — bu yerda tarjima kerak emas. */
  description: string;
  entityType?: string;
  entityId?: string;
  actorProfileId?: string;
  actorName?: string;
  createdDate?: string;
}
