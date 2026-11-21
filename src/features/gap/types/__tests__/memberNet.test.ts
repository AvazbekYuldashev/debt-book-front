import { GapAmountDTO, GapMemberDTO, memberNet, netByUnit, splitNet } from '../gap';

/**
 * Yo'nalish testi: a'zo qatori va guruh kartasi BIR XIL tomondan
 * gapirishi kerak.
 *
 * Xato real bo'lgan: guruh kartasi "Hozirgi qarz 250 000" deb tursa,
 * pastdagi a'zo qatori o'sha pulni yashil "+250 000" qilib ko'rsatardi.
 * Sabab — `GapMemberDTO` ning `given`/`received` maydonlari QARSHI
 * TOMONNING tomonidan yoziladi, karta esa mening `myTotal*` larimdan
 * hisoblanadi.
 */

const money = (amount: number): GapAmountDTO[] => [
  { unitCode: 'UZS', unitLabel: "so'm", unitType: 'MONEY', amount },
];

const member = (given: GapAmountDTO[], received: GapAmountDTO[]): GapMemberDTO => ({
  memberId: 'm1',
  memberName: 'Sardor',
  memberPhone: '+998901413656',
  me: false,
  received,
  given,
  awaitingMyConfirm: 0,
});

describe('memberNet', () => {
  it("men olgan pul QARZ bo'lib chiqadi (manfiy)", () => {
    // Sardor menga 250 000 bergan -> DTO da `given`.
    const net = memberNet(member(money(250_000), []));
    expect(net).toHaveLength(1);
    expect(net[0].amount).toBe(-250_000);
  });

  it("men bergan pul HAQ bo'lib chiqadi (musbat)", () => {
    // Men Sardorga 250 000 berganman -> u OLGAN, DTO da `received`.
    const net = memberNet(member([], money(250_000)));
    expect(net[0].amount).toBe(250_000);
  });

  it('berib qaytarib olingan summa nolga tushadi', () => {
    expect(memberNet(member(money(1_000), money(1_000)))).toHaveLength(0);
  });

  it("guruh kartasi bilan BIR XIL tomonni ko'rsatadi", () => {
    // Karta mening tomonimdan: net = berganim - olganim.
    // Men 250 000 olganman, berganim yo'q.
    const kartaNet = netByUnit(/* myTotalGiven */ [], /* myTotalReceived */ money(250_000));
    const { haq: kartaHaq, qarz: kartaQarz } = splitNet(kartaNet);
    expect(kartaHaq).toHaveLength(0);
    expect(kartaQarz[0].amount).toBe(250_000);

    // O'sha holat a'zo qatorida: Sardor menga bergan.
    const { haq: qatorHaq, qarz: qatorQarz } = splitNet(memberNet(member(money(250_000), [])));
    expect(qatorHaq).toHaveLength(0);
    expect(qatorQarz[0].amount).toBe(250_000);
  });
});
