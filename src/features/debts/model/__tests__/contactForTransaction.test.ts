import { contactForTransaction } from '../transactionMapping';
import type { MoneyResponseDTO } from '../../../../shared/types/money';
import type { Contact } from '../../context/ContactsContext';

const ME_BIZ = 'biz-mening-dokonim';
const SHOP = 'biz-yangi-market';
const ALI = 'prof-ali';

const contact = (over: Partial<Contact>): Contact =>
  ({
    id: 'c-1',
    firstName: '',
    lastName: '',
    phone: '',
    username: '',
    fullName: 'Kontakt',
    partyType: 'PROFILE',
    partyId: ALI,
    ...over,
  }) as Contact;

const money = (over: Partial<MoneyResponseDTO>): MoneyResponseDTO =>
  ({
    id: 'm-1',
    amount: 100000,
    visible: true,
    createdDate: '2026-11-18T09:00:00',
    description: '',
    ...over,
  }) as MoneyResponseDTO;

/*
 * Xabarda faqat `actorPhone` bor va u DOIM odamning shaxsiy raqami —
 * odam biznes nomidan ish ko'rgan bo'lsa ham. Shuning uchun kontakt
 * yozuvning TOMONLARI bo'yicha topiladi.
 */
describe('contactForTransaction', () => {
  it('shaxsiy kontakt — qarzdor tomonda', () => {
    const ali = contact({ id: 'c-ali', partyId: ALI, partyType: 'PROFILE' });
    const found = contactForTransaction(
      money({ debtorId: ALI, debtorType: 'PROFILE', creditorBusinessId: ME_BIZ }),
      [ali],
    );
    expect(found?.id).toBe('c-ali');
  });

  it('shaxsiy kontakt — haqdor tomonda', () => {
    const ali = contact({ id: 'c-ali', partyId: ALI });
    const found = contactForTransaction(
      money({ creditorId: ALI, creditorType: 'PROFILE' }),
      [ali],
    );
    expect(found?.id).toBe('c-ali');
  });

  /*
   * ENG MUHIM holat: odam biznes nomidan ish ko'rgan. Yozuv biznes
   * kontaktida yotadi, xabardagi raqam esa o'sha odamniki. Ilgari
   * raqam bo'yicha qidirilar va uning SHAXSIY kontakti ochilardi —
   * ya'ni odam yozuvi yo'q daftarga tushardi.
   */
  it('biznes nomidan qilingan oldi-berdi biznes kontaktida topiladi', () => {
    const shop = contact({ id: 'c-market', partyId: SHOP, partyType: 'BUSINESS_ACCOUNT' });
    const ownerPersonal = contact({ id: 'c-shaxsiy', partyId: 'prof-dokonchi', phone: '998901112233' });

    const found = contactForTransaction(
      money({ creditorBusinessId: SHOP, creditorType: 'BUSINESS_ACCOUNT', debtorBusinessId: ME_BIZ }),
      [ownerPersonal, shop],
    );

    expect(found?.id).toBe('c-market');
  });

  it('eski yozuvda tomon turi yo‘q — shaxsiy deb olinadi', () => {
    const ali = contact({ id: 'c-ali', partyId: ALI });
    expect(contactForTransaction(money({ debtorId: ALI }), [ali])?.id).toBe('c-ali');
  });

  it('biznes kontakt shaxsiy id bilan moslanmaydi', () => {
    // Biznes tomon DOIM `businessId` bilan yoziladi — `debtorId` bo‘yicha
    // tasodifiy moslik kartani almashtirib yuborardi.
    const shop = contact({ id: 'c-market', partyId: SHOP, partyType: 'BUSINESS_ACCOUNT' });
    expect(contactForTransaction(money({ debtorId: SHOP }), [shop])).toBeUndefined();
  });

  it('mos kontakt bo‘lmasa — topilmadi', () => {
    const ali = contact({ id: 'c-ali', partyId: ALI });
    expect(contactForTransaction(money({ debtorId: 'prof-begona' }), [ali])).toBeUndefined();
  });

  it('partyId bo‘sh kontakt hisobga olinmaydi', () => {
    const bosh = contact({ id: 'c-bosh', partyId: '' });
    expect(contactForTransaction(money({ debtorId: '' }), [bosh])).toBeUndefined();
  });
});
