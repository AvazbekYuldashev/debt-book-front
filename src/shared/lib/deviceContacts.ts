// SDK 57'da 'expo-contacts' asosiy importidagi getContactsAsync ESKIRGAN va xato
// tashlaydi ("deprecated ... use expo-contacts/legacy"). Legacy API — o'sha funksiya
// asosli interfeys (getContactsAsync, requestPermissionsAsync, Fields) ni saqlaydi.
import * as Contacts from 'expo-contacts/legacy';
import { normalizePhone } from './phone';

// ============================================================
//  Qurilma (telefon) kontaktlarini o'qish — FAQAT mobil (native).
//  Web'da bu fayl o'rniga deviceContacts.web.ts ishlatiladi (bundlерга
//  expo-contacts kirmaydi), shu tufayli web build buzilmaydi.
// ============================================================

export interface DeviceContact {
  id: string;
  name: string;
  phone: string; // normalizatsiya qilingan (imkon bo'lsa 998XXXXXXXXX)
  rawPhone: string; // asl ko'rinish
}

export const deviceContactsSupported = true;

export class ContactsPermissionError extends Error {
  constructor() {
    super('permission-denied');
    this.name = 'ContactsPermissionError';
  }
}

export async function loadDeviceContacts(): Promise<DeviceContact[]> {
  // Avval MAVJUD ruxsatni tekshiramiz; faqat berilmagan bo'lsa so'raymiz.
  // (Har safar requestPermissionsAsync chaqirish ba'zi Android'larda ruxsat
  //  bergandan keyin ham noto'g'ri holat qaytarishi mumkin edi.)
  let permission = await Contacts.getPermissionsAsync();
  if (permission.status !== 'granted') {
    permission = await Contacts.requestPermissionsAsync();
  }
  if (permission.status !== 'granted') {
    throw new ContactsPermissionError();
  }

  // getContactsAsync ba'zi qurilmalarda (yoki New Arch release'da) xato tashlashi
  // mumkin — haqiqiy xabarni yuqoriga uzatamiz (diagnostika/aniq tuzatish uchun).
  type ContactData = Awaited<ReturnType<typeof Contacts.getContactsAsync>>['data'];
  let data: ContactData = [];
  try {
    const res = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.FirstName,
        Contacts.Fields.LastName,
        Contacts.Fields.PhoneNumbers,
      ],
    });
    data = res?.data ?? [];
  } catch (e) {
    console.warn('[deviceContacts] getContactsAsync failed:', e);
    throw new Error(e instanceof Error ? e.message : 'contacts-read-failed');
  }

  const result: DeviceContact[] = [];
  const seen = new Set<string>();

  for (const contact of data) {
    const numbers = contact.phoneNumbers;
    if (!numbers || numbers.length === 0) continue;
    const raw = (numbers[0]?.number || '').trim();
    if (!raw) continue;

    const name =
      contact.name?.trim() ||
      [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
      raw;
    const phone = normalizePhone(raw);

    // Bir xil raqamli kontaktlar takrorlanmasin.
    if (seen.has(phone)) continue;
    seen.add(phone);

    result.push({ id: `${contact.id ?? raw}:${phone}`, name, phone, rawPhone: raw });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
