import { MoneyResponseDTO, PartyType } from '../../../shared/types/money';

// ============================================================
//  Domain use-case: tranzaksiyada QARAMA-QARSHI tomon xodimi kimligini aniqlash.
//
//  Qoida: har bir tomon O'ZINIKINI emas, BOSHQA tomonnikini ko'radi.
//    - men biznes hisobidan oldi-berdi qilsam -> menga men TANLAGAN odam raqami;
//    - qarama-qarshi tomonga esa menikisi ko'rinadi.
//  Ilgari ro'yxatdan har doim `creditorBusinessProfilePhone` olinardi — kim "men"
//  ekani hisobga olinmagani uchun pul bergan tomonga o'zining raqami ko'rinardi.
// ============================================================

export interface TransactionOwner {
  partyType: PartyType;
  partyId: string;
}

interface SideRef {
  type?: PartyType;
  profileId?: string;
  businessId?: string;
  performerPhone?: string;
}

const creditorSide = (tx: MoneyResponseDTO): SideRef => ({
  type: tx.creditorType,
  profileId: tx.creditorId,
  businessId: tx.creditorBusinessId,
  performerPhone: tx.creditorBusinessProfilePhone,
});

const debtorSide = (tx: MoneyResponseDTO): SideRef => ({
  type: tx.debtorType,
  profileId: tx.debtorId,
  businessId: tx.debtorBusinessId,
  performerPhone: tx.debtorBusinessProfilePhone,
});

/** Shu tomon joriy hisob (owner) ekanligini tekshiradi. */
function isOwnerSide(side: SideRef, owner: TransactionOwner): boolean {
  if (!owner.partyId) return false;
  if (owner.partyType === 'BUSINESS_ACCOUNT') {
    return Boolean(side.businessId) && side.businessId === owner.partyId;
  }
  // Eski yozuvlarda `type` bo'lmasligi mumkin — profil id'si yetarli belgi.
  return (!side.type || side.type === 'PROFILE') && Boolean(side.profileId) && side.profileId === owner.partyId;
}

const isBusinessSide = (side: SideRef): boolean =>
  side.type === 'BUSINESS_ACCOUNT' || Boolean(side.businessId);

/**
 * Joriy hisob nuqtai nazaridan qarama-qarshi tomon xodimining telefoni.
 * Qarama-qarshi tomon jismoniy shaxs bo'lsa (xodim tushunchasi yo'q) yoki tomonni
 * aniqlab bo'lmasa — bo'sh satr (interfeysda qator umuman ko'rsatilmaydi).
 *
 * @param viewerProfileId ko'rayotgan foydalanuvchi profili — eski yozuvlar uchun
 *        zaxira mantiqda "yaratuvchi men emasmanmi?" tekshiruviga kerak.
 */
export function counterpartyPerformerPhone(
  tx: MoneyResponseDTO,
  owner: TransactionOwner,
  viewerProfileId?: string,
): string {
  const creditor = creditorSide(tx);
  const debtor = debtorSide(tx);

  const ownerIsCreditor = isOwnerSide(creditor, owner);
  const ownerIsDebtor = isOwnerSide(debtor, owner);
  // Ikkalasi ham mos kelsa yoki hech biri mos kelmasa — tomonni aniqlab bo'lmaydi.
  if (ownerIsCreditor === ownerIsDebtor) return '';

  const other = ownerIsCreditor ? debtor : creditor;
  if (!isBusinessSide(other)) return '';
  if (other.performerPhone) return other.performerPhone;

  // Zaxira: a'zo saqlanmagan eski yozuvlarda, agar yozuvni MEN yaratmagan bo'lsam,
  // yaratuvchi aynan qarama-qarshi tomonning xodimi bo'ladi.
  const createdByViewer = Boolean(viewerProfileId) && tx.createdByProfileId === viewerProfileId;
  return !createdByViewer && tx.createdByProfilePhone ? tx.createdByProfilePhone : '';
}
