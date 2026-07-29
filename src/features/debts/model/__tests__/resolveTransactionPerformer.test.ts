import { counterpartyPerformerPhone } from '../resolveTransactionPerformer';
import { MoneyResponseDTO } from '../../../../shared/types/money';

const BIZ_A = 'biz-a';
const BIZ_B = 'biz-b';
const PROF_ME = 'prof-me';
const PROF_THEM = 'prof-them';

const MY_MEMBER = '+998902597891';
const THEIR_MEMBER = '+998901112233';

const tx = (over: Partial<MoneyResponseDTO>): MoneyResponseDTO => ({
  id: 'tx-1',
  amount: 10,
  currency: 'RUB',
  visible: true,
  createdDate: '2026-07-29T19:44:00',
  description: 'test',
  ...over,
});

describe('counterpartyPerformerPhone — biznes <-> biznes', () => {
  // Men (BIZ_A) pul berdim; qarshi tomon a'zosi sifatida THEIR_MEMBER tanlangan.
  const businessToBusiness = tx({
    creditorType: 'BUSINESS_ACCOUNT',
    creditorBusinessId: BIZ_A,
    creditorBusinessProfilePhone: MY_MEMBER,
    debtorType: 'BUSINESS_ACCOUNT',
    debtorBusinessId: BIZ_B,
    debtorBusinessProfilePhone: THEIR_MEMBER,
    createdByProfileId: PROF_ME,
    createdByProfilePhone: MY_MEMBER,
  });

  it('pul bergan biznesga QARSHI tomon a’zosi ko‘rinadi (o‘ziniki emas)', () => {
    const phone = counterpartyPerformerPhone(
      businessToBusiness,
      { partyType: 'BUSINESS_ACCOUNT', partyId: BIZ_A },
      PROF_ME,
    );
    expect(phone).toBe(THEIR_MEMBER);
    expect(phone).not.toBe(MY_MEMBER);
  });

  it('qabul qilgan biznesga esa yuboruvchi tomon a’zosi ko‘rinadi', () => {
    expect(
      counterpartyPerformerPhone(businessToBusiness, { partyType: 'BUSINESS_ACCOUNT', partyId: BIZ_B }),
    ).toBe(MY_MEMBER);
  });
});

describe('counterpartyPerformerPhone — biznes <-> shaxsiy', () => {
  const businessToPersonal = tx({
    creditorType: 'BUSINESS_ACCOUNT',
    creditorBusinessId: BIZ_A,
    creditorBusinessProfilePhone: MY_MEMBER,
    debtorType: 'PROFILE',
    debtorId: PROF_THEM,
    createdByProfileId: PROF_ME,
    createdByProfilePhone: MY_MEMBER,
  });

  it('jismoniy shaxsga biznes xodimi ko‘rinadi', () => {
    expect(counterpartyPerformerPhone(businessToPersonal, { partyType: 'PROFILE', partyId: PROF_THEM })).toBe(
      MY_MEMBER,
    );
  });

  it('biznesga esa hech nima ko‘rinmaydi — qarshi tomon jismoniy shaxs, xodimi yo‘q', () => {
    expect(
      counterpartyPerformerPhone(
        businessToPersonal,
        { partyType: 'BUSINESS_ACCOUNT', partyId: BIZ_A },
        PROF_ME,
      ),
    ).toBe('');
  });

  it('shaxsiy -> biznesda men tanlagan a’zo ko‘rinadi', () => {
    const personalToBusiness = tx({
      creditorType: 'PROFILE',
      creditorId: PROF_ME,
      debtorType: 'BUSINESS_ACCOUNT',
      debtorBusinessId: BIZ_B,
      debtorBusinessProfilePhone: THEIR_MEMBER,
      createdByProfileId: PROF_ME,
      createdByProfilePhone: MY_MEMBER,
    });
    expect(counterpartyPerformerPhone(personalToBusiness, { partyType: 'PROFILE', partyId: PROF_ME }, PROF_ME)).toBe(
      THEIR_MEMBER,
    );
  });
});

describe('counterpartyPerformerPhone — chekka holatlar', () => {
  it('shaxsiy <-> shaxsiy: xodim tushunchasi yo‘q', () => {
    const personal = tx({
      creditorType: 'PROFILE',
      creditorId: PROF_ME,
      debtorType: 'PROFILE',
      debtorId: PROF_THEM,
      createdByProfileId: PROF_ME,
      createdByProfilePhone: MY_MEMBER,
    });
    expect(counterpartyPerformerPhone(personal, { partyType: 'PROFILE', partyId: PROF_ME }, PROF_ME)).toBe('');
  });

  it('begona kuzatuvchi uchun bo‘sh (tomonni aniqlab bo‘lmaydi)', () => {
    const t = tx({
      creditorType: 'BUSINESS_ACCOUNT',
      creditorBusinessId: BIZ_A,
      creditorBusinessProfilePhone: MY_MEMBER,
      debtorType: 'BUSINESS_ACCOUNT',
      debtorBusinessId: BIZ_B,
      debtorBusinessProfilePhone: THEIR_MEMBER,
    });
    expect(counterpartyPerformerPhone(t, { partyType: 'BUSINESS_ACCOUNT', partyId: 'biz-x' })).toBe('');
  });

  it('eski yozuv: a’zo saqlanmagan, yozuvni qarshi tomon yaratgan -> yaratuvchi ko‘rsatiladi', () => {
    const legacy = tx({
      creditorType: 'BUSINESS_ACCOUNT',
      creditorBusinessId: BIZ_A,
      debtorType: 'PROFILE',
      debtorId: PROF_THEM,
      createdByProfileId: PROF_ME,
      createdByProfilePhone: MY_MEMBER,
    });
    expect(counterpartyPerformerPhone(legacy, { partyType: 'PROFILE', partyId: PROF_THEM }, PROF_THEM)).toBe(
      MY_MEMBER,
    );
  });

  it('eski yozuv: yozuvni O‘ZIM yaratgan bo‘lsam, o‘z raqamim ko‘rsatilmaydi', () => {
    const legacy = tx({
      creditorType: 'BUSINESS_ACCOUNT',
      creditorBusinessId: BIZ_A,
      debtorType: 'BUSINESS_ACCOUNT',
      debtorBusinessId: BIZ_B,
      createdByProfileId: PROF_ME,
      createdByProfilePhone: MY_MEMBER,
    });
    expect(
      counterpartyPerformerPhone(legacy, { partyType: 'BUSINESS_ACCOUNT', partyId: BIZ_A }, PROF_ME),
    ).toBe('');
  });
});
