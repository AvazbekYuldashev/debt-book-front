/**
 * Dastur mualliflari va rasmiy hujjat ma'lumotlari.
 *
 * Bitta joyda turadi: ekran shu ro'yxatni chizadi, shuning uchun yangi odam
 * yoki yangi aloqa kanali qo'shish uchun faqat shu faylni tahrirlash kifoya.
 *
 * Ma'lumotlar Adliya vazirligi bergan DGU 68223 guvohnomasidan olingan.
 */

export type ContactKind = 'phone' | 'telegram' | 'email';

export interface CreditContact {
  kind: ContactKind;
  /** Ko'rinadigan matn: raqam, @username yoki e-pochta. */
  value: string;
}

export interface CreditPerson {
  /** Tarjima kaliti: kim ekani (g'oya muallifi / dasturchi). */
  roleKey: string;
  /** To'liq ism — guvohnomadagi shaklda. */
  fullName: string;
  /** Kundalik murojaat uchun qisqa ism. */
  shortName: string;
  contacts: CreditContact[];
}

/**
 * Aloqa ma'lumotlari to'ldirilmagan bo'lsa qator umuman chizilmaydi —
 * bo'sh "bog'lanish" tugmasi ishonchni yo'qotadi.
 */
export const APP_CREDITS: CreditPerson[] = [
  {
    roleKey: 'about.roleIdea',
    fullName: "Tojiboyev Mirzoxidjon Mirzajonovich",
    shortName: 'Mirzohid',
    contacts: [
      { kind: 'phone', value: '+998 88 817 27 27' },
      { kind: 'telegram', value: '@Tojiboyev_Mirzohid' },
    ],
  },
  {
    roleKey: 'about.roleDeveloper',
    fullName: "Yuldashev Avazbek Maxamadsoli o'g'li",
    shortName: 'Avazbek',
    contacts: [
      { kind: 'phone', value: '+998 90 141 36 56' },
      { kind: 'telegram', value: '@Greed_Coder' },
      { kind: 'email', value: 'avazbek.yuldashev3003@gmail.com' },
    ],
  },
];

/** Dasturiy mahsulotlar davlat reyestridagi yozuv. */
export const APP_CERTIFICATE = {
  programName: 'Tez Top',
  number: 'DGU 68223',
  applicationNumber: 'DT 202609510',
  applicationDate: '19.07.2026',
  registeredDate: '10.08.2026',
  authority: "O'zbekiston Respublikasi Adliya vazirligi",
  rightsHolders: [
    '"TEZ-TOP" mas\'uliyati cheklangan jamiyat',
    'Tojiboyev Mirzoxidjon Mirzajonovich',
    "Sobirov Mirtemur Mirzajon o'g'li",
  ],
};

/** Aloqa turiga mos havola. */
export const contactUrl = (contact: CreditContact): string => {
  const value = contact.value.trim();
  switch (contact.kind) {
    case 'phone':
      return `tel:${value.replace(/[^\d+]/g, '')}`;
    case 'telegram':
      return `https://t.me/${value.replace(/^@/, '')}`;
    case 'email':
      return `mailto:${value}`;
  }
};
