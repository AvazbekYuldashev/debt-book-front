import type { ProductFormValues } from '../components/ProductFormModal';
import type { ProductCreateDTO } from '../types/product';

/**
 * Forma qiymatlaridan server uchun so'rov tanasini yasaydi.
 *
 * Alohida fayl va sinaladigan qilib chiqarilgan sababi: bu joy maydon
 * TUSHIB QOLISHIGA juda moyil. Aynan shunday bo'lgan ham — formaga "miqdor"
 * qo'shilgan, lekin payload'ga kiritilmagani uchun hamma mahsulot 1 bo'lib
 * saqlanaverdi va nuqson faqat bazaga qarab topildi. Endi har bir maydon
 * test bilan qulflangan.
 *
 * Bo'sh matnlar YUBORILMAYDI: server uchun "qiymat yo'q" va "bo'sh satr"
 * bir xil ma'noda bo'lishi kerak. Artikulda bu ayniqsa muhim — bo'sh
 * satrlar yagonalik tekshiruvida bir-biriga to'qnashardi.
 */
export function buildProductPayload(values: ProductFormValues): ProductCreateDTO {
  const code = values.code.trim();
  const description = values.description.trim();
  const categoryId = values.categoryId.trim();

  return {
    name: values.name.trim(),
    price: values.price,
    currency: values.currency,
    unit: values.unit,
    // Miqdor HAR DOIM yuboriladi: u 1 bo'lsa ham aniq qiymat, "yo'q" emas.
    // Aks holda tahrirlashda eski qiymat o'zgarmay qolardi.
    amount: values.amount > 0 ? values.amount : 1,
    ...(code ? { code } : {}),
    ...(description ? { description } : {}),
    // Bo'sh satr = "kategoriyasiz"; server uni null deb qabul qiladi.
    ...(categoryId ? { categoryId } : {}),
  };
}
