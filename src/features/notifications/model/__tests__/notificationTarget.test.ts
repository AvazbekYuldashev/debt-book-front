import { isRentalNotification, rentalTarget } from '../notificationTarget';
import type { RentalResponseDTO } from '../../../rentals/types/rental';
import type { NotificationDTO } from '../../types/notification';

const notification = (patch: Partial<NotificationDTO> = {}): NotificationDTO => ({
  id: 'n-1',
  message: 'xabar',
  read: false,
  createdDate: '2026-11-18T09:00:00',
  ...patch,
});

const rental = (patch: Partial<RentalResponseDTO> = {}): RentalResponseDTO =>
  ({ id: 'r-1', clientId: 'c-1', owner: false, ...patch }) as RentalResponseDTO;

describe('isRentalNotification', () => {
  it('yozuv id bo‘lsa — ijara xabari', () => {
    expect(isRentalNotification(notification({ rentalId: 'r-1' }))).toBe(true);
  });

  it('kunlik xulosada yozuv yo‘q, lekin turi aytadi', () => {
    expect(isRentalNotification(notification({ kind: 'RENTAL_DIGEST' }))).toBe(true);
  });

  it('pul xabari ijara emas', () => {
    expect(isRentalNotification(notification())).toBe(false);
  });
});

/*
 * Ijara ro'yxati FAQAT egasining ish maydonida bor. Mijozni u yerga
 * yuborish bo'sh ekranga olib borardi, shuning uchun u o'sha do'konning
 * kontakt kartasiga boradi — ijara bo'limi shu yerda.
 */
describe('rentalTarget', () => {
  it('egasi — ijara kartasiga', () => {
    expect(rentalTarget(rental({ owner: true }))).toEqual({
      to: 'rentalDetail',
      rentalId: 'r-1',
    });
  });

  it('mijoz — do‘konning kontakt kartasiga', () => {
    expect(rentalTarget(rental({ owner: false }))).toEqual({
      to: 'contact',
      contactId: 'c-1',
    });
  });

  it('yozuv olinmasa hech qayerga bormaymiz', () => {
    expect(rentalTarget(null)).toEqual({ to: 'none' });
  });

  it('mijoz, lekin kontakt qatori yo‘q — borish joyi yo‘q', () => {
    expect(rentalTarget(rental({ owner: false, clientId: '' }))).toEqual({ to: 'none' });
  });
});
