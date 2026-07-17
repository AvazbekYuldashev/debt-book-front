import * as Contacts from 'expo-contacts';
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
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new ContactsPermissionError();
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Name, Contacts.Fields.FirstName, Contacts.Fields.LastName, Contacts.Fields.PhoneNumbers],
  });

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

    result.push({ id: `${contact.id}:${phone}`, name, phone, rawPhone: raw });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
