import {
  busyShare,
  freeQuantity,
  groupRentalItems,
  isFullyBusy,
  itemsForPeriod,
  rentalItemCategories,
} from '../rentalStock';
import type { RentalItemResponseDTO } from '../../types/rentalItem';

const item = (over: Partial<RentalItemResponseDTO> = {}): RentalItemResponseDTO => ({
  id: 'i1',
  name: 'Lesa',
  period: 'DAY',
  price: 5000,
  currency: 'UZS',
  totalQuantity: 100,
  busyQuantity: 0,
  ...over,
});

describe("ombor: band va bo'sh", () => {
  it("100 tadan 50 tasi band — 50 tasi bo'sh", () => {
    const lesa = item({ busyQuantity: 50 });
    expect(freeQuantity(lesa)).toBe(50);
    expect(busyShare(lesa)).toBe(0.5);
    expect(isFullyBusy(lesa)).toBe(false);
  });

  it('hammasi mijozlarda', () => {
    const lesa = item({ busyQuantity: 100 });
    expect(freeQuantity(lesa)).toBe(0);
    expect(isFullyBusy(lesa)).toBe(true);
  });

  it("jami kamaytirilgan bo'lsa bo'sh soni manfiy bo'lmaydi", () => {
    const lesa = item({ totalQuantity: 40, busyQuantity: 50 });
    expect(freeQuantity(lesa)).toBe(0);
    expect(busyShare(lesa)).toBe(1);
  });

  it('server satr yuborsa ham son', () => {
    const lesa = item({
      totalQuantity: '100.000' as unknown as number,
      busyQuantity: '30' as unknown as number,
    });
    expect(freeQuantity(lesa)).toBe(70);
  });
});

describe('ombor: guruhlash', () => {
  const list = [
    item({ id: '1', name: 'Stul', category: "To'y" }),
    item({ id: '2', name: 'Opalubka', category: 'Qurilish' }),
    item({ id: '3', name: 'Arava', category: null }),
    item({ id: '4', name: 'Chodir', category: "To'y", period: 'HOUR' }),
  ];

  it('kategoriya bo\'yicha, kategoriyasizlar oxirida', () => {
    const groups = groupRentalItems(list);
    expect(groups.map((g) => g.category)).toEqual(['Qurilish', "To'y", null]);
    expect(groups[1].items.map((i) => i.name)).toEqual(['Chodir', 'Stul']);
  });

  it('mavjud kategoriyalar takrorsiz', () => {
    expect(rentalItemCategories(list)).toEqual(['Qurilish', "To'y"]);
  });

  it('davr bo\'yicha filtr', () => {
    expect(itemsForPeriod(list, 'HOUR').map((i) => i.id)).toEqual(['4']);
  });
});
