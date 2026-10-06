/**
 * Fokus halqasi belgilari - web'da `dataSet` orqali `data-focus` bo'lib
 * chiqadi va applyWebTheme.web.ts'dagi CSS shunga qarab chizadi.
 * Native'da e'tiborsiz qoladi. Doimiy obyekt: har renderda yangisi
 * yasalmaydi.
 */

/**
 * Halqa ICHKARIGA chiziladi.
 *
 * To'liq enli qator overflow:hidden yumaloq karta ichida turadi
 * (SettingsGroup, ro'yxat kartalari). Tashqi halqani karta kesib, faqat
 * 1px chiziq qoldirardi - klaviaturadagi odam fokus qayerdaligini ko'rmasdi.
 * Faqat qatorning o'ziga: ichidagi kichik tugmalarga emas.
 *
 * Faqat O'Z ichki chekkasi (padding) bor qatorga. Chekkasiz element -
 * padding'li karta ichidagi MenuRow, qator ichidagi CategoryRow/ProductRow
 * asosiy qismi - avatar/ikonkani chetiga taqab turadi: ichki halqa ularning
 * ostida qolib, ikonkani kesib o'tardi. Ularga tashqi halqa sig'adi.
 */
export const FOCUS_INSET = { focus: 'inset' } as const;

/**
 * Halqa CHIZILMAYDI: maydon fokusni o'z chegarasi bilan ko'rsatadi
 * (Input, SearchField) - ustidan ikkinchi halqa ortiqcha.
 */
export const FOCUS_SELF = { focus: 'self' } as const;
