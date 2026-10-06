/**
 * Ro'yxat OXIRIDA "+" (FloatingActionButton) uchun qoldiriladigan bo'shliq.
 *
 * Tugma 60px bo'yida va pastdan `spacing.lg` (24px) chekingan, ya'ni u
 * ekranning pastki 84px ini egallaydi. Bo'shliq shundan sal kattaroq —
 * oxirgi qator tugma bilan yonma-yon turmasin.
 *
 * MUHIM: bu bo'shliq KONTENT konteyneriga beriladi, ko'rish oynasiga
 * EMAS. Ya'ni ro'yxat to'liq balandlikda qoladi va aylantirish paytida
 * qatorlar tugma ostidan o'tishi mumkin — bu normal, "+" suzuvchi tugma.
 * Faqat ro'yxat OXIRIGA yetilganda oxirgi qator tugmadan yuqori ko'tariladi.
 *
 * Ko'rish oynasiga berilganda ro'yxat doimiy ravishda kaltalashib qolardi:
 * ekranning pastki qismi har doim bo'sh turib, ko'rinadigan qatorlar soni
 * kamayardi.
 */
export const FAB_CLEARANCE = 96;

/**
 * Pastki panel o'rtasidagi ko'tarilgan ovoz tugmasi (doira) diametri.
 *
 * Shu yerda, feature ichida emas: panel chizig'idan qancha chiqishini
 * shared ekranlar ham bilishi kerak, shared kod esa feature'ni import
 * qilmasligi shart.
 */
export const VOICE_BUTTON_SIZE = 58;

/**
 * Ovoz doirasi ustida qoldiriladigan bo'shliq.
 *
 * Doira panel chizig'idan yarmi (29px) bilan YUQORIGA chiqib turadi.
 * Tab ekranidagi har qanday AYLANMAYDIGAN, pastga qadalgan kontent
 * (Oldim/Berdim qatori, izoh) shu bo'shliqdan yuqorida turishi SHART:
 * aks holda doira tugmalarning pastki burchaklarini yopib qo'yardi.
 * +8 - doira bilan tugma bir-biriga tegib turmasin.
 *
 * FAB_CLEARANCE bu ishni QILMAYDI: u faqat o'ng chekkadagi "+" uchun va
 * aylanadigan ro'yxat OXIRIGA beriladi.
 */
export const VOICE_BUTTON_CLEARANCE = VOICE_BUTTON_SIZE / 2 + 8;
