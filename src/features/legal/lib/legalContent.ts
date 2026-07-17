// ============================================================
//  Huquqiy hujjatlar matni (oferta, foydalanish shartlari, maxfiylik siyosati).
//  Matn hozircha faqat o'zbek tilida — web/privacy.html va delete-account.html
//  bilan bir xil (ular ham faqat o'zbekcha). Sarlavha/tugma matnlari 3 tilda
//  (translations.ts), lekin hujjat matni tarjima qilinmagan.
//  MUHIM: bu matn yuridik maslahat emas — joriy funksiyaga mos qoralama;
//  ishga tushirishdan oldin yurist tomonidan ko'rib chiqilishi tavsiya etiladi.
// ============================================================

export type LegalDocKey = 'offer' | 'terms' | 'privacy';

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDoc {
  titleKey: string;
  version: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

const CONTACT_EMAIL = 'avazbek.yuldashev3003@gmail.com';

export const LEGAL_DOCS: Record<LegalDocKey, LegalDoc> = {
  privacy: {
    titleKey: 'legal.privacyTitle',
    version: '1.0.0',
    lastUpdated: '2026-07-11',
    intro:
      "Ushbu hujjat Tez Top ilovasi (Android ilova va pul-hisob.uz veb-versiyasi) " +
      "foydalanuvchi ma'lumotlarini qanday yig'ishi, ishlatishi va himoya qilishini tushuntiradi.",
    sections: [
      {
        heading: "1. Qanday ma'lumotlar yig'iladi",
        body:
          "• Telefon raqami, ism-familiya, parol (xesh ko'rinishida) — akkaunt yaratish va tizimga kirish uchun.\n" +
          "• Siz kiritgan mijoz/kontakt yozuvlari (ism, telefon) — qarz daftarini yuritish, ilovaning asosiy vazifasi.\n" +
          "• Oldi-berdi (tranzaksiya) yozuvlari: summa, valyuta, sana, izoh — qarz/haq balanslarini hisoblash uchun.\n" +
          "• Ixtiyoriy profil/biznes rasmi — faqat siz yuklasangiz, profilingizda ko'rsatish uchun.\n" +
          "• Telefon kontaktlari — faqat siz \"Telefon kontaktlaridan qo'shish\"ni tanlaganingizda, tanlangan kontaktni " +
          "mijoz sifatida qo'shish uchun. Kontaktlar ro'yxati fonda yig'ilmaydi va ommaviy serverga yuklanmaydi — " +
          "faqat siz tanlaganlari saqlanadi.",
      },
      {
        heading: "2. Ma'lumotlar qanday himoyalanadi",
        body:
          "Barcha aloqa HTTPS (TLS) orqali shifrlangan holda uzatiladi. Parollar faqat xesh (bcrypt) ko'rinishida " +
          "saqlanadi. Ma'lumotlar bizning serverimizdagi bazada saqlanadi va faqat sizning akkauntingiz orqali ko'rinadi.",
      },
      {
        heading: '3. Uchinchi tomonlar',
        body:
          "Ma'lumotlaringiz uchinchi tomonlarga sotilmaydi va reklama maqsadida berilmaydi. Ro'yxatdan o'tishda " +
          "tasdiqlash kodi yuborish uchun SMS provayderi (Eskiz.uz) ishlatiladi — unga faqat telefon raqami uzatiladi. " +
          "Ilovada reklama yo'q va analitika/kuzatuv SDK'lari ishlatilmaydi.",
      },
      {
        heading: "4. Ma'lumotni saqlash muddati va o'chirish",
        body:
          "Ma'lumotlar akkauntingiz mavjud bo'lgan muddat davomida saqlanadi. Hisob-kitobingiz to'liq yopiq bo'lsa " +
          "(hech kimdan haqdor va hech kimga qarzdor bo'lmasangiz), akkauntingizni istalgan vaqtda Profil → Profilni " +
          "o'chirish orqali o'chirishingiz mumkin. Akkaunt o'chirilganda kirish ma'lumotlari va profil rasmi o'chiriladi; " +
          "oldi-berdi yozuvlari esa qarama-qarshi tomon daftari tarixining bir qismi sifatida saqlanib qoladi.",
      },
      {
        heading: '5. Bolalar',
        body: "Ilova moliyaviy hisob-kitob uchun mo'ljallangan bo'lib, 13 yoshgacha bo'lgan bolalarga mo'ljallanmagan.",
      },
      {
        heading: '6. Murojaat',
        body: `Maxfiylik bo'yicha savollar uchun: ${CONTACT_EMAIL}. Siyosat o'zgarsa, ushbu sahifada yangilangan sana bilan e'lon qilinadi.`,
      },
    ],
  },

  terms: {
    titleKey: 'legal.termsTitle',
    version: '1.0.0',
    lastUpdated: '2026-07-16',
    intro:
      "Ushbu Foydalanish shartlari (\"Shartlar\") Tez Top ilovasidan (\"Xizmat\") foydalanish " +
      "tartibini belgilaydi. Ilovadan ro'yxatdan o'tib yoki foydalanib, siz ushbu Shartlarga to'liq rozilik " +
      "bildirasiz. Rozi bo'lmasangiz, Xizmatdan foydalanishni to'xtating.",
    sections: [
      {
        heading: '1. Xizmat tavsifi',
        body:
          "Xizmat — foydalanuvchilarga mijozlar/kontaktlar bilan qarz-haq (oldi-berdi) yozuvlarini yuritish, " +
          "balanslarni hisoblash va shaxsiy xarajatlarni kuzatish imkonini beruvchi vosita. Xizmat hozirda bepul " +
          "taqdim etiladi.",
      },
      {
        heading: '2. Foydalanuvchi majburiyatlari',
        body:
          "Siz: (a) ro'yxatdan o'tishda haqiqiy ma'lumot kiritishga; (b) akkaunt va parolingiz xavfsizligini " +
          "ta'minlashga; (c) Xizmatdan qonunga zid, firibgarlik yoki boshqa foydalanuvchilarga zarar yetkazadigan " +
          "maqsadlarda foydalanmaslikka rozilik bildirasiz.",
      },
      {
        heading: '3. Hisob va xavfsizlik',
        body:
          "Akkauntingiz ostida amalga oshirilgan barcha harakatlar uchun siz javobgarsiz. Akkauntingizga ruxsatsiz " +
          "kirish haqida shubha tug'ilsa, darhol parolni almashtiring va biz bilan bog'laning.",
      },
      {
        heading: '4. Javobgarlikni cheklash',
        body:
          "Xizmat orqali kiritilgan qarz/haq yozuvlarining to'g'riligi uchun foydalanuvchining o'zi javobgar. " +
          "Xizmat \"bo'lgan holicha\" taqdim etiladi; uzilishlar, texnik nosozliklar yoki ma'lumot yo'qolishi " +
          "natijasida yuzaga kelgan bilvosita zararlar uchun taqdimotchi javobgar emas — qonun yo'l qo'ygan " +
          "maksimal darajada.",
      },
      {
        heading: "5. Xizmatni to'xtatish va akkauntni o'chirish",
        body:
          "Siz istalgan vaqtda Profil bo'limi orqali akkauntingizni o'chirishingiz mumkin (barcha hisob-kitoblar " +
          "yopiq bo'lgan taqdirda). Shartlarni buzgan foydalanuvchining akkaunti bloklanishi yoki o'chirilishi mumkin.",
      },
      {
        heading: "6. Shartlarga o'zgartirish kiritish",
        body:
          "Ushbu Shartlar vaqti-vaqti bilan yangilanishi mumkin. Muhim o'zgarishlar haqida ilova ichida " +
          "xabardor qilinasiz; yangilangan Shartlarni qabul qilmasangiz, Xizmatdan foydalanishni to'xtatishingiz kerak.",
      },
      {
        heading: '7. Amal qiluvchi qonunchilik',
        body: "Ushbu Shartlar O'zbekiston Respublikasi qonunchiligiga muvofiq talqin etiladi.",
      },
    ],
  },

  offer: {
    titleKey: 'legal.offerTitle',
    version: '1.0.0',
    lastUpdated: '2026-07-16',
    intro:
      "Ushbu hujjat Tez Top ilovasi xizmatlaridan foydalanish bo'yicha ommaviy ofertadir. " +
      "Ilovada ro'yxatdan o'tish yoki undan foydalanishni boshlash — ushbu ofertani to'liq va so'zsiz qabul " +
      "qilish (aksept) hisoblanadi.",
    sections: [
      {
        heading: '1. Xizmat predmeti',
        body:
          "Taqdimotchi foydalanuvchiga qarz/haq yozuvlarini yuritish va xarajatlarni kuzatish uchun dasturiy " +
          "vositani taqdim etadi. Hozirgi kunda barcha funksiyalar bepul asosda taqdim etiladi.",
      },
      {
        heading: "2. To'lov shartlari",
        body:
          "Hozirda Xizmat foydalanuvchidan har qanday to'lov talab qilmaydi. Kelajakda qo'shimcha (pullik) " +
          "funksiyalar joriy etilsa, bu haqda foydalanuvchilar oldindan xabardor qilinadi va pullik xizmatdan " +
          "foydalanish faqat foydalanuvchining alohida roziligi bilan amalga oshiriladi.",
      },
      {
        heading: "3. Taraflarning huquq va majburiyatlari",
        body:
          "Taqdimotchi Xizmatning barqaror ishlashi uchun asosli harakat qiladi, lekin uzluksiz va xatosiz " +
          "ishlashga kafolat bermaydi. Foydalanuvchi Xizmatdan ushbu oferta va Foydalanish shartlariga muvofiq " +
          "foydalanishga majburdir.",
      },
      {
        heading: '4. Javobgarlik',
        body: "Taraflarning javobgarligi amaldagi qonunchilik va Foydalanish shartlarida belgilangan chegaralarda amalga oshiriladi.",
      },
      {
        heading: "5. Amal qilish muddati va bekor qilish",
        body:
          "Oferta foydalanuvchi Xizmatdan foydalanishni boshlagan paytdan e'tiboran, akkaunt o'chirilgunga qadar " +
          "amal qiladi. Taqdimotchi ofertaga o'zgartirish kiritish huquqini o'zida saqlab qoladi; yangi versiya " +
          "ilova ichida e'lon qilinadi.",
      },
    ],
  },
};
