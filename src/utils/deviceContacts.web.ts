// Web'da qurilma kontaktlariga kirish yo'q — bo'sh (no-op) implementatsiya.
// Bu fayl webpack tomonidan deviceContacts.ts o'rniga tanlanadi, shu tufayli
// expo-contacts native moduli web bundle'ga umuman kirmaydi.

export interface DeviceContact {
  id: string;
  name: string;
  phone: string;
  rawPhone: string;
}

export const deviceContactsSupported = false;

export class ContactsPermissionError extends Error {
  constructor() {
    super('permission-denied');
    this.name = 'ContactsPermissionError';
  }
}

export async function loadDeviceContacts(): Promise<DeviceContact[]> {
  return [];
}
