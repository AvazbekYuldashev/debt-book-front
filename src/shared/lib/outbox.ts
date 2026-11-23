import { storage } from './storage';
import { networkStatus } from './networkStatus';
import { newIdempotencyKey } from './idempotency';

// ============================================================
//  OFLAYN NAVBAT ("outbox").
//
//  Tarmoqsiz paytda bajarilgan yozuv amali shu yerga tushadi va
//  internet qaytganda serverga yuboriladi.
//
//  NEGA React Query ning to'xtagan mutatsiyalari emas: bu kodbazada
//  yozuvlar bir xil shaklda emas — bir qismi `useMutation`, bir qismi
//  oddiy `await` chaqiruvi. Navbat API qatlamida turgani uchun
//  ikkalasi ham bir xil himoyalanadi.
//
//  TAKRORLANISHDAN HIMOYA navbatning o'zida emas, kalitda: har yozuv
//  o'z `Idempotency-Key` i bilan saqlanadi va server o'sha kalit bilan
//  kelgan ikkinchi so'rovni bajarmaydi. Shuning uchun qayta yuborish
//  xavfsiz — javob yo'lda yo'qolgan bo'lsa ham pul ikki marta
//  yozilmaydi.
// ============================================================

const STORAGE_KEY = 'debt-book.outbox';

export type OutboxMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OutboxItem {
  /** Navbatdagi o'rin uchun id (kalitdan boshqa). */
  id: string;
  /** Serverga boradigan "bir amal — bitta yozuv" kaliti. */
  key: string;
  method: OutboxMethod;
  /** API ildiziga nisbatan yo'l, masalan `/core/debt/give`. */
  url: string;
  body?: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

/** Bitta yozuvni serverga yuboradigan funksiya (apiClient shu yerga ulanadi). */
export type OutboxSender = (item: OutboxItem) => Promise<void>;

/**
 * Yuborish natijasi.
 *  `sent`    — o'tdi, navbatdan olinadi;
 *  `retry`   — tarmoq yoki server vaqtincha javob bermadi, navbatda qoladi;
 *  `dropped` — server RAD ETDI (4xx), qayta urinishning ma'nosi yo'q.
 */
export type OutboxOutcome = 'sent' | 'retry' | 'dropped';

type Listener = () => void;
/** Amal serverga YETIB BORGANDA chaqiriladi — ekranlar yangilanishi uchun. */
type SentListener = (item: OutboxItem) => void;

let items: OutboxItem[] = [];
let loaded = false;
let flushing = false;
let sender: OutboxSender | null = null;
const listeners = new Set<Listener>();
const sentListeners = new Set<SentListener>();

const emit = (): void => listeners.forEach((listener) => listener());

const persist = async (): Promise<void> => {
  await storage.set(STORAGE_KEY, JSON.stringify(items));
};

const load = async (): Promise<void> => {
  if (loaded) return;
  loaded = true;
  const raw = await storage.get(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      items = parsed as OutboxItem[];
      emit();
    }
  } catch {
    // Buzuq yozuv butun navbatni yo'qotmasin: bo'sh navbat bilan davom etamiz.
    items = [];
  }
};

export const outbox = {
  /** Yuboruvchini ulaydi (dastur ishga tushganda bir marta). */
  setSender(next: OutboxSender | null): void {
    sender = next;
  },

  /** Diskdagi navbatni o'qiydi. Dastur ochilishida chaqiriladi. */
  async init(): Promise<void> {
    await load();
  },

  /** Hozir navbatda nechta amal turibdi. */
  size(): number {
    return items.length;
  },

  list(): readonly OutboxItem[] {
    return items;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Amal serverga yetib borganda xabar beradi.
   *
   * Ekranlarda oflaynda qo'shilgan yozuv VAQTINCHALIK ko'rinishda
   * turadi (soat belgisi bilan). U haqiqiy, server bergan yozuvga
   * almashishi uchun o'sha paytda ma'lumot qayta so'ralishi kerak.
   */
  subscribeSent(listener: SentListener): () => void {
    sentListeners.add(listener);
    return () => {
      sentListeners.delete(listener);
    };
  },

  /**
   * Amalni navbatga qo'yadi.
   *
   * Kalit berilmasa shu yerda yaratiladi: navbatga tushgan amal uchun
   * kalit ALBATTA bo'lishi kerak, aks holda qayta yuborish xavfli
   * bo'lardi.
   */
  async enqueue(entry: {
    method: OutboxMethod;
    url: string;
    body?: unknown;
    key?: string;
  }): Promise<OutboxItem> {
    await load();
    const item: OutboxItem = {
      id: newIdempotencyKey(),
      key: entry.key ?? newIdempotencyKey(),
      method: entry.method,
      url: entry.url,
      body: entry.body,
      createdAt: Date.now(),
      attempts: 0,
    };
    items = [...items, item];
    await persist();
    emit();
    return item;
  },

  /**
   * Navbatni serverga yuboradi — KIRGAN TARTIBDA.
   *
   * Tartib muhim: "kontakt qo'shdim, keyin unga qarz yozdim" ketma-ketligi
   * teskari ketsa, ikkinchisi bajarilmasdi. Shuning uchun birinchi
   * yuborilmagan amalda to'xtaymiz va keyingilarini urinmaymiz.
   */
  async flush(): Promise<{ sent: number; dropped: number; left: number }> {
    await load();
    if (flushing || !sender || items.length === 0) {
      return { sent: 0, dropped: 0, left: items.length };
    }
    flushing = true;
    let sent = 0;
    let dropped = 0;
    try {
      while (items.length > 0) {
        const [head] = items;
        const outcome = await trySend(head);
        if (outcome === 'retry') break;
        items = items.slice(1);
        await persist();
        emit();
        if (outcome === 'sent') {
          sent += 1;
          sentListeners.forEach((listener) => listener(head));
        } else {
          dropped += 1;
        }
      }
    } finally {
      flushing = false;
    }
    return { sent, dropped, left: items.length };
  },

  /** Navbatni butunlay tozalaydi (hisobdan chiqishda). */
  async clear(): Promise<void> {
    items = [];
    loaded = true;
    await persist();
    emit();
  },
};

const trySend = async (item: OutboxItem): Promise<OutboxOutcome> => {
  if (!sender) return 'retry';
  try {
    await sender(item);
    return 'sent';
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429) {
      /*
       * Server RAD ETDI — masalan ma'lumot noto'g'ri yoki yozuv
       * o'chirilgan. Qayta yuborish natijani o'zgartirmaydi, navbatda
       * qoldirish esa butun navbatni abadiy to'sib qo'yardi: ortidagi
       * amallar hech qachon ketmasdi.
       *
       * 408 va 429 bundan mustasno: ular "keyinroq urin" degani.
       */
      return 'dropped';
    }
    item.attempts += 1;
    item.lastError = (error as { message?: string })?.message;
    await persist();
    return 'retry';
  }
};

/**
 * Tarmoq qaytganda navbatni O'ZI yuboradi.
 *
 * Dastur ishga tushganda bir marta ulanadi. Shu yerda ham, zond ham
 * (`networkStatus`) bir manbaga tayanadi, ya'ni "internet keldi" degan
 * xulosa bitta joyda chiqariladi.
 */
export const startOutboxAutoFlush = (): (() => void) => {
  const run = (): void => {
    if (networkStatus.isOnline()) void outbox.flush();
  };
  run();
  return networkStatus.subscribe(run);
};
