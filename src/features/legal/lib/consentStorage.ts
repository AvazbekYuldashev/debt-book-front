import { storage } from '../../../shared/lib/storage';

// Terms/Privacy versiyasi birga oshiriladi — versiyalar farq qilsa, rozilik qayta so'raladi.
export const LEGAL_CONSENT_VERSION = '2026-07-16-v1';
const CONSENT_STORAGE_KEY = 'legalConsentVersion';

export async function getAcceptedConsentVersion(): Promise<string | null> {
  return storage.get(CONSENT_STORAGE_KEY);
}

export async function setConsentAccepted(): Promise<void> {
  await storage.set(CONSENT_STORAGE_KEY, LEGAL_CONSENT_VERSION);
}
