import apiClient, { setApiAuthToken } from '../../../shared/api/apiClient';
import { fileNameFor } from '../model/voiceFormat';

/**
 * Ovozli kiritish ikki bosqich: avval ovoz matnga, keyin matn ma'noga.
 *
 * Ular ATAYLAB alohida so'rov. Ikkisi ikki xil tashqi xizmat, va ikkinchisi
 * ishlamay qolganda birinchisining natijasi yo'qolmasligi kerak — aytilgan
 * matn baribir maydonga tushadi.
 */

export type VoiceIntentKind =
  | 'TRANSACTION'
  | 'EXPENSE'
  | 'GAP'
  | 'PERSON_NAME'
  | 'PRODUCT'
  | 'NOTE';
export type VoiceDirection = 'GAVE' | 'TOOK';
export type ContactOutcome = 'RESOLVED' | 'AMBIGUOUS' | 'NOT_FOUND';
export type VoiceCurrency = 'UZS' | 'USD' | 'RUB';

export interface VoiceContactOption {
  /** Kontakt yozuvining id'si — ro'yxatdan topish uchun. */
  id: string;
  name: string;
  /**
   * Telefon raqami.
   *
   * Ko'rsatiladi, chunki tanlov ro'yxati aynan bir xil raqamli yoki bir
   * xil ismli yozuvlardan iborat bo'lishi mumkin - shunda ism yolg'iz
   * ajratmaydi.
   */
  phoneNumber?: string | null;
  /** Qarama-qarshi tomon — oldi-berdi shu id bilan yaratiladi. */
  partyId?: string | null;
  partyType?: string | null;
}

/** Narxnomadan tanilgan qator. */
export interface VoiceItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

/**
 * "Barcha qarzimni qaytardim" deyilganda yopiladigan bitta valyuta qatori.
 *
 * `amount` - EKRANDA ko'rinadigan sof qoldiq (haq minus qarz), xom jami
 * emas. Yo'nalish esa qoldiqning belgisidan chiqadi.
 */
export interface VoiceSettlement {
  currency: VoiceCurrency;
  amount: number;
  direction: VoiceDirection;
}

/**
 * Ovozdan tanilgan gap kassa a'zosi.
 *
 * Kassa ham keladi, chunki a'zo yolg'iz ma'noga ega emas: bir odam bir
 * nechta kassada bo'lishi mumkin va amal qaysi kassada bajarilishi
 * shundan bilinadi.
 */
export interface VoiceGapMember {
  memberId: string;
  memberName: string;
  groupId: string;
  groupName: string;
  /**
   * Kassaning birligi. Server qaytaradi, chunki a'zo ekrani usiz
   * ochilmaydi — mijozdagi ro'yxat esa birlik bo'yicha filtrlangan
   * bo'lishi va kerakli kassa o'sha paytda unda bo'lmasligi mumkin.
   */
  unitCode: string;
  unitLabel: string;
  unitType: 'MONEY' | 'GOODS';
}

export interface VoiceIntent {
  /** Maydonga qo'yiladigan matn. Tushunilmagan bo'lsa ham to'la keladi. */
  text: string;
  /**
   * AYTILGAN gapning o'zi, qisqartirilmagan.
   *
   * Model `text` ni qisqartiradi - summani va ismni tashlaydi, chunki
   * ular o'z maydonlarida turadi. Lekin izohda odam O'Z GAPINI ko'rishni
   * kutadi: "sinfdoshlar kassasida" degan bo'lak gapning o'rnini
   * bosmaydi. Shuning uchun xom matn alohida olib o'tiladi.
   */
  transcript?: string;
  /** Model gapni tushundimi. `false` bo'lsa quyidagilar bo'sh. */
  understood: boolean;
  amount?: number | null;
  direction?: VoiceDirection | null;
  /** Aytilgan valyuta. Aytilmagan bo'lsa null — formadagi tanlov qoladi. */
  currency?: VoiceCurrency | null;
  /** Narxnoma qatorlari. Bo'sh bo'lsa oddiy pul yozuvi. */
  items?: VoiceItem[] | null;
  /** "7000×2" — savat izohi. */
  calcNote?: string | null;
  /**
   * Yopilishi kerak bo'lgan qoldiqlar — har valyutaga bitta.
   *
   * Bittadan ko'p bo'lsa forma NAVBAT bilan ochiladi: bitta yozuv bitta
   * valyutada bo'ladi, qo'shish esa kursni o'ylab topish bo'lardi.
   */
  settlements?: VoiceSettlement[] | null;
  /** Xarajat kategoriyasi — foydalanuvchining o'z ro'yxatidan topilgani. */
  categoryId?: string | null;
  categoryName?: string | null;
  personName?: string | null;
  /** Gap kassa: topilgan a'zo. Kontaktdan ALOHIDA ro'yxat. */
  gapOutcome?: ContactOutcome | null;
  gapMember?: VoiceGapMember | null;
  gapOptions?: VoiceGapMember[] | null;
  contactOutcome?: ContactOutcome | null;
  contactId?: string | null;
  contactPartyId?: string | null;
  contactPartyType?: string | null;
  contactOptions?: VoiceContactOption[] | null;
}

/**
 * Ovozni matnga aylantiradi.
 *
 * Yozuvni serverga yuboramiz, u esa tanish xizmatiga. To'g'ridan-to'g'ri
 * ulanmaymiz: xizmat kaliti ilova ichida ochiq yotib qolardi.
 */
/**
 * Token BERILGANDA gina qo'yiladi.
 *
 * `setApiAuthToken(undefined)` umumiy Authorization sarlavhasini
 * O'CHIRADI. Ekranlar tokenni uzatmagani uchun har bir ovoz chaqiruvi
 * butun ilovani tokensiz qoldirardi: so'rov 403 olar, perehvatchik
 * tokenni yangilab qayta yuborar edi.
 *
 * Narxi ikki tomonlama. Ovoz fayli IKKI MARTA yuklanardi - mobil
 * internetda bu sezilarli. Va o'sha lahzada ketayotgan boshqa so'rovlar
 * ham sarlavhasiz qolib, ular ham 403 bo'lardi.
 */
const applyToken = (token?: string): void => {
  if (token) setApiAuthToken(token);
};

export const transcribe = async (
  blob: Blob,
  token?: string,
  durationMs?: number,
): Promise<string> => {
  applyToken(token);

  const form = new FormData();
  form.append('file', blob, fileNameFor(blob.type || null));
  form.append('language', 'uz');
  // Davomiylik SARF HISOBI uchun: xizmat daqiqasiga to'lanadi, javobida esa
  // davomiylik yo'q. Bu yagona joy, uni aniq bilish mumkin bo'lgan.
  if (durationMs && durationMs > 0) form.append('durationMs', String(Math.round(durationMs)));

  const { data } = await apiClient.post<{ text?: string }>('/voice/stt', form, {
    // Content-Type'ni O'ZIMIZ qo'ymaymiz: FormData chegara (boundary) satrini
    // o'zi qo'shadi, qo'lda yozsak u tushib qoladi va server faylni ko'rmaydi.
    headers: { 'Content-Type': undefined as unknown as string },
    // Tanish 15 soniyadan uzunroq davom etishi mumkin.
    timeout: 60000,
  });

  return data?.text ?? '';
};

/**
 * Matndan maydonlarni ajratadi.
 *
 * Yiqilsa istisno ko'tarmaydi — aytilgan matnning o'zi qaytadi. Ovozli
 * kiritish shu holatda ham ishlaydi, faqat oddiy diktovka bo'lib qoladi.
 */
export const understand = async (
  transcript: string,
  kind: VoiceIntentKind,
  options?: { accountType?: string; token?: string },
): Promise<VoiceIntent> => {
  applyToken(options?.token);

  try {
    const { data } = await apiClient.post<VoiceIntent>(
      '/voice/understand',
      { transcript, kind },
      {
        params: options?.accountType ? { accountType: options.accountType } : undefined,
        timeout: 30000,
      },
    );
    return { ...data, text: data?.text ?? transcript, transcript };
  } catch {
    return { text: transcript, transcript, understood: false };
  }
};
