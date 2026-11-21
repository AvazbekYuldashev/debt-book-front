/**
 * Yuqori qatordagi sirtlarning YAGONA balandligi.
 *
 * Qatorda uchta mustaqil komponent turadi — ish maydoni almashtirgichi,
 * ekran nomi va bildirishnoma tugmasi — va ularning har biri o'z
 * o'lchamini yozardi: 52, 31 va 48 piksel. Yonma-yon turganda bu uchta
 * sirt bir to'plamdek emas, tasodifan yig'ilgandek ko'rinardi.
 *
 * Qiymat almashtirgichdan keladi: avatar (44) + ikki tomondan ichki
 * bo'shliq (4+4) + shisha chegarasi (1+1). U qatordagi eng yirik
 * element va qolgan ikkitasi unga tenglashadi — teskarisi avatarni
 * kichraytirishni talab qilardi.
 *
 * Chegara ATAYIN hisobga olingan: RN o'lchamni border-box bilan
 * o'lchaydi, ya'ni mazmundan kelib chiqadigan balandlikka chegara
 * QO'SHILADI, qotirilgan balandlikka esa qo'shilmaydi. Chegarasiz
 * hisoblanganda almashtirgich 54, qolgan ikkitasi 52 bo'lib qolardi.
 *
 * Balandlikni oshirish qatorni CHO'ZMAYDI: qator balandligini baribir
 * almashtirgich belgilaydi, qolgan ikkitasi esa uning ichida edi.
 */
export const TOP_BAR_PILL_HEIGHT = 54;
