import type { VoiceIntent } from '../api/voice';

/**
 * Ovozdan kelgan xarajatni qaysi kategoriyaga yozishni hal qiladi.
 *
 * Server gapni tushunadi va kategoriyani O'ZI topishga urinadi (ism
 * foydalanuvchining haqiqiy kategoriyalari ro'yxatiga solishtiriladi).
 * Lekin u har doim ham topa olmaydi: odam yangi nom aytgan bo'lishi yoki
 * umuman kategoriya aytmagan bo'lishi mumkin. Shu uch holatni bu yerda
 * ajratamiz - ekran keyin faqat ko'rsatadi.
 *
 * Sof funksiya: React'siz sinaladi.
 */

export interface ExpenseCategoryOption {
  id: string;
  name: string;
}

export type ExpenseCommand =
  /** Hammasi topildi: kategoriyani ochib, formani to'ldirib qo'yish mumkin. */
  | {
      kind: 'OPEN_CATEGORY';
      categoryId: string;
      categoryName: string;
      amount: number;
      description: string;
      calcNote: string | null;
      /** Qaysi ovozdan kelgani - saqlangach havola yozish uchun. */
      commandId?: string;
    }
  /** Summa bor, kategoriya yo'q yoki topilmadi - odam o'zi tanlaydi. */
  | { kind: 'PICK_CATEGORY'; amount: number; description: string; calcNote: string | null }
  /** Gap tushunilmadi yoki summa chiqmadi. */
  | { kind: 'NOT_UNDERSTOOD' };

/** Qiyoslash uchun: bosh/oxiridagi bo'shliq va katta-kichik harf farqi yo'qoladi. */
const normalize = (value: string): string => value.trim().toLowerCase();

export const resolveExpenseCommand = (
  intent: VoiceIntent,
  categories: ExpenseCategoryOption[],
): ExpenseCommand => {
  const amount = typeof intent.amount === 'number' ? intent.amount : 0;
  // Summasiz xarajat yo'q: nol yoki manfiy qiymat xato tanishdan keladi.
  if (!intent.understood || amount <= 0) return { kind: 'NOT_UNDERSTOOD' };

  /**
   * Izoh - modelning QISQARTIRGAN matni (`text`), xom transkript emas:
   * summa va kategoriya o'z maydonlarida turadi, ularni izohda takrorlash
   * qatorni uzaytiradi, xolos.
   */
  const description = intent.text?.trim() ?? '';
  const calcNote = intent.calcNote ?? null;

  // 1. Server id topgan bo'lsa - u ro'yxatda hali ham bormi, tekshiramiz:
  //    kategoriya o'chirilgan bo'lishi mumkin.
  const byId = intent.categoryId
    ? categories.find((item) => item.id === intent.categoryId)
    : undefined;

  // 2. Id yo'q, lekin nom bor: ro'yxatdan aynan shu nomni qidiramiz.
  //    Taxminiy moslashtirish ATAYLAB yo'q - noto'g'ri kategoriyaga pul
  //    yozilgandan ko'ra odamdan so'ragan yaxshi.
  const byName = !byId && intent.categoryName
    ? categories.find((item) => normalize(item.name) === normalize(intent.categoryName as string))
    : undefined;

  const found = byId ?? byName;
  if (found) {
    return {
      kind: 'OPEN_CATEGORY',
      categoryId: found.id,
      categoryName: found.name,
      amount,
      description,
      calcNote,
      commandId: intent.commandId,
    };
  }

  return { kind: 'PICK_CATEGORY', amount, description, calcNote };
};
