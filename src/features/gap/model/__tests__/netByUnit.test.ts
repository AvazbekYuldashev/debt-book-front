import { netByUnit, toAmount } from '../../types/gap';
import type { GapAmountDTO } from '../../types/gap';

const usd = (amount: number): GapAmountDTO => ({
  unitCode: 'USD',
  unitLabel: '$',
  unitType: 'MONEY',
  amount,
});

const kg = (amount: number): GapAmountDTO => ({
  unitCode: 'KG_GOSHT',
  unitLabel: "kg go'sht",
  unitType: 'GOODS',
  amount,
});

/**
 * Bu testlar foydalanuvchi topgan xatoni qulflaydi: ilova bergan va olganni
 * YALPI holda ko'rsatib, 1000 berib 1000 qaytarib olganda ham "+1000 / −1000"
 * chiqarardi. Sof qoldiq nol bo'lishi kerak edi.
 */
describe('netByUnit', () => {
  it('bergan va olgan teng bo\'lsa hisob toza — qator qolmaydi', () => {
    expect(netByUnit([usd(1000)], [usd(1000)])).toEqual([]);
  });

  it('ko\'proq bergan bo\'lsa qoldiq musbat (haqdor)', () => {
    const net = netByUnit([usd(1000)], []);
    expect(net).toHaveLength(1);
    expect(toAmount(net[0].amount)).toBe(1000);
  });

  it('ko\'proq olgan bo\'lsa qoldiq manfiy (qarzdor)', () => {
    const net = netByUnit([], [usd(100)]);
    expect(net).toHaveLength(1);
    expect(toAmount(net[0].amount)).toBe(-100);
  });

  it('qisman qaytarilsa farqi qoladi', () => {
    const net = netByUnit([usd(1000)], [usd(400)]);
    expect(toAmount(net[0].amount)).toBe(600);
  });

  it('birliklar QO\'SHILMAYDI — har biri alohida hisoblanadi', () => {
    const net = netByUnit([usd(1000), kg(5)], [usd(1000), kg(2)]);
    // Dollar tenglashdi va tushib qoldi, go'sht qoldi.
    expect(net).toHaveLength(1);
    expect(net[0].unitCode).toBe('KG_GOSHT');
    expect(toAmount(net[0].amount)).toBe(3);
  });

  it('juftlikdagi ikki tomon bir-birining aksi, yig\'indisi nol', () => {
    // Men 1000 berdim: mening qoldig'im +1000, uniki -1000.
    const meniki = netByUnit([usd(1000)], []);
    const uniki = netByUnit([], [usd(1000)]);
    expect(toAmount(meniki[0].amount) + toAmount(uniki[0].amount)).toBe(0);
  });

  it('bo\'sh va undefined kirish xavfsiz', () => {
    expect(netByUnit(undefined, undefined)).toEqual([]);
    expect(netByUnit([], [])).toEqual([]);
  });
});
