import { applyTransactionIntent, TransactionFormState } from '../applyTransactionIntent';
import type { VoiceIntent } from '../../api/voice';

/** Testda formatlash sodda: minglarni bo'shliq bilan ajratadi. */
const format = (raw: string) => Number(raw).toLocaleString('en-US').replace(/,/g, ' ');

const emptyForm: TransactionFormState = {
  amount: '',
  description: '',
  counterpartyId: '',
  counterpartyEditable: true,
};

const intent = (over: Partial<VoiceIntent> = {}): VoiceIntent => ({
  text: 'nonga',
  understood: true,
  ...over,
});

describe('applyTransactionIntent', () => {
  it("izoh har doim qo'yiladi", () => {
    expect(applyTransactionIntent(intent({ text: 'nonga berdim' }), emptyForm, format).description)
      .toBe('nonga berdim');
  });

  it("tushunilmagan bo'lsa ham xom matn izohga tushadi", () => {
    const raw = intent({ text: 'aliga ellik ming berdim', understood: false });
    expect(applyTransactionIntent(raw, emptyForm, format).description)
      .toBe('aliga ellik ming berdim');
  });

  it("bo'sh summa maydoni to'ldiriladi", () => {
    const patch = applyTransactionIntent(intent({ amount: 50000 }), emptyForm, format);
    expect(patch.amount).toBe('50 000');
  });

  /**
   * ENG MUHIM QOIDA: qo'lda yozilgan summa ustidan yozilmaydi. Bu xato
   * sezilmay qoladi — odam saqlagandan keyin biladi.
   */
  it("qo'lda yozilgan summa saqlanib qoladi", () => {
    const typed = { ...emptyForm, amount: '30 000' };
    const patch = applyTransactionIntent(intent({ amount: 50000 }), typed, format);
    expect(patch.amount).toBeUndefined();
  });

  it('summa aytilmagan bo\'lsa maydon tegilmaydi', () => {
    expect(applyTransactionIntent(intent({ amount: null }), emptyForm, format).amount).toBeUndefined();
    expect(applyTransactionIntent(intent({}), emptyForm, format).amount).toBeUndefined();
  });

  it("nol, manfiy va buzuq summa qo'yilmaydi", () => {
    for (const bad of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(applyTransactionIntent(intent({ amount: bad }), emptyForm, format).amount).toBeUndefined();
    }
  });

  // ---------- kontakt ----------

  it('aniq topilgan odam qo\'yiladi', () => {
    const patch = applyTransactionIntent(
      intent({ contactOutcome: 'RESOLVED', contactPartyId: 'p-1' }),
      emptyForm,
      format,
    );
    expect(patch.counterpartyId).toBe('p-1');
  });

  /**
   * Ikkita Ali chiqsa dastur TAXMIN QILMAYDI. Ovozli kiritishning eng
   * xavfli joyi shu: qarz begona odamning yozuviga tushib qolishi mumkin.
   */
  it('ikkita mos odam bo\'lsa hech kim tanlanmaydi', () => {
    const patch = applyTransactionIntent(
      intent({
        contactOutcome: 'AMBIGUOUS',
        contactOptions: [
          { id: 'c1', name: 'Ali Valiyev', partyId: 'p-1' },
          { id: 'c2', name: 'Ali Karimov', partyId: 'p-2' },
        ],
      }),
      emptyForm,
      format,
    );
    expect(patch.counterpartyId).toBeUndefined();
  });

  it('topilmagan odam uchun hech narsa qo\'yilmaydi', () => {
    const patch = applyTransactionIntent(
      intent({ contactOutcome: 'NOT_FOUND' }),
      emptyForm,
      format,
    );
    expect(patch.counterpartyId).toBeUndefined();
  });

  it('allaqachon tanlangan odam almashtirilmaydi', () => {
    const chosen = { ...emptyForm, counterpartyId: 'p-9' };
    const patch = applyTransactionIntent(
      intent({ contactOutcome: 'RESOLVED', contactPartyId: 'p-1' }),
      chosen,
      format,
    );
    expect(patch.counterpartyId).toBeUndefined();
  });

  /** Kontakt formadan tashqarida qat'iy bo'lsa — unga tegilmaydi. */
  it('qat\'iy kontaktli formada odam o\'zgartirilmaydi', () => {
    const fixed = { ...emptyForm, counterpartyEditable: false };
    const patch = applyTransactionIntent(
      intent({ contactOutcome: 'RESOLVED', contactPartyId: 'p-1' }),
      fixed,
      format,
    );
    expect(patch.counterpartyId).toBeUndefined();
    // Izoh va summa baribir to'ladi.
    expect(patch.description).toBe('nonga');
  });

  it('summa va odam birgalikda qo\'yiladi', () => {
    const patch = applyTransactionIntent(
      intent({ text: 'nonga', amount: 50000, contactOutcome: 'RESOLVED', contactPartyId: 'p-1' }),
      emptyForm,
      format,
    );
    expect(patch).toEqual({ description: 'nonga', amount: '50 000', counterpartyId: 'p-1' });
  });
});
