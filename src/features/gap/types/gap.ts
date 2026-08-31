/**
 * Gap kassa: guruh + a'zolar + erkin oldi-berdi.
 *
 * Navbat, qur'a, davr va belgilangan oylik badal YO'Q — istalgan a'zo
 * istalgan paytda istalgan a'zo bilan hisob-kitob qiladi. Yagona qat'iy
 * qoida: yozuvni bir tomon kiritadi, ikkinchi tomon tasdiqlaydi.
 */

export type GapTransferStatus = 'WAITING' | 'CONFIRMED';

/**
 * Badal nimada o'lchanadi.
 *  MONEY — pul (so'm, dollar, rubl)
 *  GOODS — mahsulot (kg go'sht, litr yog', metr mato)
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
 * so'm, dollar va kg go'sht bir-biriga qo'shilmaydi.
 *
 * Raqamlar HAQIQATDA bo'lib o'tgan oldi-berdilardan: rejalashtirilgan
 * majburiyat degan narsa endi yo'q.
 */
export interface GapSummaryDTO {
  currentMonthReceived: GapAmountDTO[];
  totalReceived: GapAmountDTO[];
  currentMonthGiven: GapAmountDTO[];
  totalGiven: GapAmountDTO[];
}

/** Ro'yxatdagi bitta gap kassa qatori. */
export interface GapResponseDTO {
  id: string;
  name: string;
  /** Guruhning ODATIY birligi — yangi yozuv formasida oldindan tanlanadi. */
  unitCode: string;
  unitLabel: string;
  unitType: GapUnitType;
  /** Guruhni men yaratganmanmi — a'zo qo'shish va tahrir menga ochiq. */
  organizer: boolean;
  memberCount: number;
  /** Shu guruhda jami olganim, BIRLIK bo'yicha ajratilgan. */
  myTotalReceived: GapAmountDTO[];
  /** Shu guruhda jami berganim, BIRLIK bo'yicha ajratilgan. */
  myTotalGiven: GapAmountDTO[];
  /** Mening tasdig'imni kutayotgan yozuvlar soni. */
  awaitingMyConfirm: number;
}

/** A'zolar ro'yxatidagi bitta qator. Summalar MENGA NISBATAN. */
export interface GapMemberDTO {
  memberId: string;
  memberName: string;
  memberPhone: string | null;
  me: boolean;
  /** SHU ODAM olgan miqdor, birlik bo'yicha ajratilgan. */
  received: GapAmountDTO[];
  /** SHU ODAM bergan miqdor. Sof qoldiq = given - received. */
  given: GapAmountDTO[];
  awaitingMyConfirm: number;
}

/** Oldi-berdi tarixidagi bitta yozuv. */
export interface GapTransferDTO {
  transferId: string;
  counterpartyMemberId: string | null;
  counterpartyName: string | null;
  counterpartyPhone: string | null;
  /** Qarama-qarshi tomon joriy foydalanuvchimi. */
  counterpartyMe: boolean;
  amount: number | string;
  /** Yozuvning O'Z birligi — guruhnikidan farq qilishi mumkin. */
  unitCode: string;
  unitLabel: string;
  unitType: GapUnitType;
  note: string | null;
  date: string | null;
  confirmed: boolean;
  status: GapTransferStatus;
  /** Men shu yozuvni tasdiqlay olamanmi (o'zim kiritgan bo'lsam — yo'q). */
  canConfirm: boolean;
}

/** Bitta a'zoning hisob-kitobi. */
export interface GapMemberDetailDTO {
  memberId: string;
  groupId: string;
  groupName: string;
  unitCode: string;
  unitLabel: string;
  unitType: GapUnitType;
  memberName: string;
  memberPhone: string | null;
  me: boolean;
  totalReceived: GapAmountDTO[];
  totalGiven: GapAmountDTO[];
  /** Unga kim qancha bergan. */
  incoming: GapTransferDTO[];
  /** U kimga qancha bergan. */
  outgoing: GapTransferDTO[];
}

/** Yangi yozuv yo'nalishi: men berdim yoki men oldim. */
export type GapTransferDirection = 'GIVE' | 'TAKE';

export interface GapTransferCreateDTO {
  counterpartyMemberId: string;
  amount: number;
  note?: string;
  direction: GapTransferDirection;
  /** Berilmasa guruhning odatiy birligi olinadi. */
  unitType?: GapUnitType;
  unitCode?: string;
  unitLabel?: string;
}

export interface GapGroupCreateDTO {
  name: string;
  unitType: GapUnitType;
  unitCode: string;
  unitLabel: string;
}

export interface GapMemberCreateDTO {
  name: string;
  phone?: string;
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
export type GapSortDirection = 'received' | 'given';

export interface GapSort {
  direction: GapSortDirection;
  unitCode: string;
}

/** `GapAmountDTO` dan `GapUnit` yasaydi — formatlash uchun. */
export const amountUnit = (entry: GapAmountDTO): GapUnit => ({
  code: entry.unitCode,
  label: entry.unitLabel,
  type: entry.unitType,
});

/**
 * Sof qoldiq: bergan - olgan, har birlik bo'yicha alohida.
 *
 * Birliklar QO'SHILMAYDI (so'm, dollar va kg go'sht bir-biriga aylanmaydi),
 * shuning uchun ayirish faqat bir xil birlik ichida bajariladi.
 *
 * Musbat -> bu odam ko'proq bergan, ya'ni HAQDOR.
 * Manfiy -> ko'proq olgan, ya'ni QARZDOR.
 * Nolga teng birliklar tushib qoladi: 1000 berib 1000 qaytarib olingan
 * bo'lsa hisob toza, qatorda hech narsa turmasligi kerak.
 */
export const netByUnit = (
  given: GapAmountDTO[] | undefined,
  received: GapAmountDTO[] | undefined,
): GapAmountDTO[] => {
  const byUnit = new Map<string, GapAmountDTO>();
  for (const entry of given ?? []) {
    byUnit.set(entry.unitCode, { ...entry, amount: toAmount(entry.amount) });
  }
  for (const entry of received ?? []) {
    const existing = byUnit.get(entry.unitCode);
    if (existing) {
      existing.amount = toAmount(existing.amount) - toAmount(entry.amount);
    } else {
      byUnit.set(entry.unitCode, { ...entry, amount: -toAmount(entry.amount) });
    }
  }
  return [...byUnit.values()].filter((entry) => toAmount(entry.amount) !== 0);
};

/**
 * Sof qoldiqni ikkiga ajratadi: HAQ (musbat) va QARZ (manfiy, moduli bilan).
 *
 * Ekranda ikkala tomon alohida katakda turadi, shuning uchun manfiy
 * qiymatlar musbatga aylantiriladi — belgi katakning o'zida ("−").
 */
export const splitNet = (net: GapAmountDTO[]) => ({
  haq: net.filter((entry) => toAmount(entry.amount) > 0),
  qarz: net
    .filter((entry) => toAmount(entry.amount) < 0)
    .map((entry) => ({ ...entry, amount: Math.abs(toAmount(entry.amount)) })),
});

/** Noldan farq qiladigan qatorlar. Bo'sh ro'yxat = hisob toza. */
export const nonZero = (items: GapAmountDTO[] | undefined): GapAmountDTO[] =>
  (items ?? []).filter((entry) => toAmount(entry.amount) !== 0);
