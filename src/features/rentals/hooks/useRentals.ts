import { useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../auth/context/AuthContext';
import {
  createRentalBatch,
  deleteRental,
  getMyRentals,
  getRentalById,
  getRentalSummary,
  payRental,
  returnRental,
  updateRental,
} from '../services/rentalService';
import {
  createRentalItem,
  deleteRentalItem,
  getRentalItems,
  updateRentalItem,
} from '../services/rentalItemService';
import type {
  RentalBatchCreateDTO,
  RentalFilterDTO,
  RentalPaymentDTO,
  RentalReturnDTO,
  RentalUpdateDTO,
} from '../types/rental';
import type { RentalItemCreateDTO, RentalItemUpdateDTO } from '../types/rentalItem';

const RENTAL_KEY = 'rental';

/**
 * Ijara so'rovlari. `gap` moduli bilan bir xil qolip: har bir hook
 * tokenni kontekstdan o'zi oladi, yozish amallaridan keyin butun bo'lim
 * yangilanadi.
 *
 * ESLATMA: ijara summasi vaqt bilan o'sadi, lekin bu TAKRORIY so'rov
 * talab qilmaydi — ekran raqamni `model/rentalMath.ts` orqali o'zi
 * qaytadan hisoblaydi. Shu sababli bu yerda `refetchInterval` yo'q:
 * har daqiqada server urib turishning hojati yo'q.
 */

export const useRentalSummary = (filter: RentalFilterDTO = {}) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [RENTAL_KEY, 'summary', filter],
    queryFn: () => getRentalSummary(filter, token),
    enabled: Boolean(token),
  });
};

/**
 * `enabled: false` — oyna yopiq turganda so'rov ketmasin (masalan ombor
 * kartasidagi "kimlarda" ro'yxati faqat karta ochilganda kerak).
 */
export const useMyRentals = (filter: RentalFilterDTO = {}, options: { enabled?: boolean } = {}) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [RENTAL_KEY, 'my', filter],
    queryFn: () => getMyRentals({ filter, token }),
    enabled: Boolean(token) && options.enabled !== false,
  });
};

export const useRental = (id: string) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [RENTAL_KEY, 'one', id],
    queryFn: () => getRentalById(id, token),
    enabled: Boolean(token) && Boolean(id),
  });
};

// ---------------------------------------------------------------- yozish

/**
 * Har qanday o'zgarishdan keyin ijara bo'limi VA qarz bo'limi yangilanadi.
 *
 * Qarz ro'yxati ham tegishli: ijara haqi mijozning qarzi bo'lib turadi,
 * demak yangi ijara ochilganda yoki puli olinganda qarz daftaridagi
 * raqam ham o'zgaradi. Faqat ijara kalitini tozalash yetmaydi — odam
 * qarzlar ekraniga o'tib eski raqamni ko'rardi.
 */
const useRentalInvalidate = () => {
  const queryClient = useQueryClient();
  return () => {
    // Ombor kaliti ham `rental` ostida: buyum berilganda yoki qaytganda
    // ombordagi BAND/BO'SH soni o'zgaradi va u ham yangilanishi shart.
    queryClient.invalidateQueries({ queryKey: [RENTAL_KEY] });
    // Kalitlar qarz bo'limidagi so'rovlar bilan AYNAN bir xil bo'lishi
    // shart (ContactsContext va useContactBalances), aks holda tozalash
    // hech narsaga tegmay o'tib ketadi.
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
    queryClient.invalidateQueries({ queryKey: ['contact-balances'] });
  };
};

/** Bir mijozga bir yoki bir nechta buyumni berish. */
export const useCreateRentalBatch = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useRentalInvalidate();

  return useMutation({
    mutationFn: (dto: RentalBatchCreateDTO) => createRentalBatch(dto, token),
    onSuccess: invalidate,
  });
};

export const useUpdateRental = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useRentalInvalidate();

  return useMutation({
    mutationFn: (dto: RentalUpdateDTO) => updateRental(dto, token),
    onSuccess: invalidate,
  });
};

/** Buyum qaytdi — hisob to'xtaydi. */
export const useReturnRental = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useRentalInvalidate();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: RentalReturnDTO }) =>
      returnRental(id, dto ?? {}, token),
    onSuccess: invalidate,
  });
};

/** Pul olindi. */
export const usePayRental = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useRentalInvalidate();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RentalPaymentDTO }) => payRental(id, dto, token),
    onSuccess: invalidate,
  });
};

export const useDeleteRental = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useRentalInvalidate();

  return useMutation({
    mutationFn: (id: string) => deleteRental(id, token),
    onSuccess: invalidate,
  });
};

// ---------------------------------------------------------------- ombor

/**
 * Ombordagi buyumlar. Kalit `rental` ostida — ijara o'zgarganda (berildi,
 * qaytdi) band/bo'sh soni ham yangilanadi.
 */
export const useRentalItems = (options: { enabled?: boolean } = {}) => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;

  return useQuery({
    queryKey: [RENTAL_KEY, 'items'],
    queryFn: () => getRentalItems(token),
    enabled: Boolean(token) && options.enabled !== false,
  });
};

export const useCreateRentalItem = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useRentalInvalidate();

  return useMutation({
    mutationFn: (dto: RentalItemCreateDTO) => createRentalItem(dto, token),
    onSuccess: invalidate,
  });
};

export const useUpdateRentalItem = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useRentalInvalidate();

  return useMutation({
    mutationFn: (dto: RentalItemUpdateDTO) => updateRentalItem(dto, token),
    onSuccess: invalidate,
  });
};

export const useDeleteRentalItem = () => {
  const { profile } = useContext(AuthContext);
  const token = profile?.jwt;
  const invalidate = useRentalInvalidate();

  return useMutation({
    mutationFn: (id: string) => deleteRentalItem(id, token),
    onSuccess: invalidate,
  });
};
