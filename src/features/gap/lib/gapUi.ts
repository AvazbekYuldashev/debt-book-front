import { formatCurrency } from '../../../shared/lib/currency';
import type { GapBadgeTone } from '../components/GapStatusBadge';
import type {
  GapContributionStatus,
  GapGroupStatus,
  GapRoundStatus,
} from '../types/gap';

/**
 * Holat -> rang ohangi xaritalari.
 *
 * Bir joyda saqlanadi: bir xil holat guruhlar ro'yxatida, davrlar jadvalida va
 * badallar ro'yxatida BIR XIL rangda ko'rinishi kerak, aks holda foydalanuvchi
 * ranglarga ishonishni to'xtatadi.
 */
export const groupStatusTone: Record<GapGroupStatus, GapBadgeTone> = {
  DRAFT: 'neutral',
  ACTIVE: 'active',
  COMPLETED: 'success',
  TERMINATED: 'danger',
};

export const roundStatusTone: Record<GapRoundStatus, GapBadgeTone> = {
  SCHEDULED: 'neutral',
  COLLECTING: 'active',
  READY_FOR_PAYOUT: 'warning',
  PAID: 'success',
  CLOSED: 'neutral',
  DISPUTED: 'danger',
};

export const contributionStatusTone: Record<GapContributionStatus, GapBadgeTone> = {
  PENDING: 'neutral',
  DECLARED: 'warning',
  CONFIRMED: 'success',
  LATE: 'danger',
  DISPUTED: 'danger',
  WAIVED: 'neutral',
};

/**
 * Ulush yorlig'i: bitta ulushli a'zoda faqat ism, ko'p ulushlida "Ism (1/2)".
 *
 * Ilgari bu yerda `shareNo` ko'rsatilardi ("Bekzod · 3-ulush") va bu
 * CHALG'ITARDI: odam uni "3 ta ulush" deb o'qirdi, holbuki u guruhdagi
 * 3-raqamli ulush degani edi. Endi raqam a'zoning O'Z ulushlari ichida
 * sanaladi va umumiy soni yonida turadi — noaniqlik qolmaydi.
 */
export const buildShareLabels = (
  shares: { id: string; memberId: string; memberName?: string }[],
): Record<string, string> => {
  const totals: Record<string, number> = {};
  shares.forEach((share) => {
    totals[share.memberId] = (totals[share.memberId] ?? 0) + 1;
  });

  const seen: Record<string, number> = {};
  const labels: Record<string, string> = {};
  shares.forEach((share) => {
    const name = share.memberName ?? '—';
    const total = totals[share.memberId] ?? 1;
    if (total === 1) {
      labels[share.id] = name;
      return;
    }
    seen[share.memberId] = (seen[share.memberId] ?? 0) + 1;
    labels[share.id] = `${name} (${seen[share.memberId]}/${total})`;
  });
  return labels;
};

/** Backend `yyyy-MM-dd` qaytaradi — ekranda `dd.MM.yyyy` ko'rsatamiz. */
export const formatGapDate = (value?: string): string => {
  if (!value) return '—';
  const parts = value.slice(0, 10).split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

/**
 * Ro'yxatdan O'ZIMNI topish.
 *
 * Profil id'si bo'yicha moslash yetarli emas: saqlangan profilda `id`
 * bo'lmasligi mumkin va unda «bu men» degan har qanday tekshiruv jimgina
 * `false` beradi. Telefon raqami esa a'zoning o'zida turadi, shuning uchun
 * ikkinchi yo'l sifatida ishlatiladi.
 */
export const findMyMember = <T extends { profileId?: string; phone?: string }>(
  members: T[],
  profile?: { id?: string; username?: string } | null,
): T | undefined => {
  const byId = profile?.id
    ? members.find((item) => item.profileId === profile.id)
    : undefined;
  if (byId) return byId;

  const mine = digitsOf(profile?.username);
  if (mine.length !== 9) return undefined;
  return members.find((item) => digitsOf(item.phone) === mine);
};

/** Telefonning oxirgi 9 raqami — 998 prefiksi bor-yo'qligiga bog'liq bo'lmaslik uchun. */
const digitsOf = (value?: string): string => (value ?? '').replace(/\D/g, '').slice(-9);

/**
 * Kassa summasini ko'rsatish.
 *
 * Gap kassa har doim ham pulda bo'lavermaydi: go'sht, yog', un ham bo'lishi
 * mumkin. Guruhda birlik yorlig'i bo'lsa summa o'sha yorliq bilan chiqadi
 * ("5 kg go'sht"), bo'lmasa oddiy valyuta formati ishlaydi.
 */
export const formatGapAmount = (
  amount: number | undefined,
  group?: { currency?: string; unitLabel?: string } | null,
): string => {
  const value = amount ?? 0;
  if (group?.unitLabel) {
    // Kilogramm va litr kasr bo'lishi odatiy hol: 1.5 kg, 1.75 litr.
    // Butun son bo'lsa kasr qismi ko'rsatilmaydi.
    const text = new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(value).replace(',', '.');
    return `${text} ${group.unitLabel}`;
  }
  return formatCurrency(value, group?.currency as never);
};
