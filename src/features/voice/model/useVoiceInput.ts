import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { transcribe, understand, VoiceIntent, VoiceIntentKind } from '../api/voice';
import { isWorthSending, pickMimeType } from './voiceFormat';
import { micPermission } from './micPermission';
import { describeMediaError } from './describeMediaError';

/**
 * Mikrofondan yozib olish va aytilganini tushunish.
 *
 * HOZIRCHA FAQAT BRAUZERDA. Android ilovasida yozib olish uchun alohida
 * native modul kerak, u esa yangi Play Market relizi degani.
 *
 * Brauzerda qo'llab-quvvatlanmagan holat JIM QOLDIRILMAYDI — tugma
 * ko'rsatiladi va bosilganda sababi aytiladi. Ilgari u yashirinardi, va
 * foydalanuvchi "tugma yo'q" bilan "ilova buzilgan" ni ajrata olmasdi:
 * masalan Telegram ichidagi brauzerda `mediaDevices` umuman yo'q, lekin
 * buni tashqaridan bilib bo'lmaydi.
 */

export type VoiceInputState = 'idle' | 'recording' | 'working';

/**
 * Xato ikki manbadan keladi va ular boshqacha ko'rsatiladi.
 *
 * `message` — SERVERDAN kelgan, u allaqachon foydalanuvchi tilida ("Ovozni
 * matnga aylantirish xizmatida mablag' tugagan"). Uni tarjima qilmaymiz,
 * shundayligicha ko'rsatamiz.
 *
 * `key` — ilovaning o'z xatosi (ruxsat berilmadi, hech narsa tanilmadi).
 * Uni tarjima qilish kerak.
 */
export interface VoiceError {
  key?: string;
  message?: string;
  /**
   * Brauzer qaytargan texnik nom (`NotAllowedError`, `NotFoundError`, ...).
   *
   * Kichik yozuvda ko'rsatiladi. Foydalanuvchi uchun emas — MEN uchun:
   * ruxsat masalasi bir necha bosqichda taxmin bilan qidirildi, chunki
   * haqiqiy sabab hech qayerda ko'rinmasdi. Endi odam ekran rasmini
   * yuborsa, sabab darhol ma'lum bo'ladi.
   */
  detail?: string;
}

export interface VoiceInputOptions {
  kind: VoiceIntentKind;
  accountType?: string;
  token?: string;
  onResult: (intent: VoiceIntent) => void;
}

export interface VoiceInput {
  supported: boolean;
  /**
   * Tugma ko'rsatiladimi.
   *
   * Brauzerda qo'llab-quvvatlanmasa ham KO'RSATILADI — bosilganda sababi
   * aytiladi. Ilgari bunday holatda tugma jimgina yashirinardi va
   * foydalanuvchi "yo'q" bilan "buzilgan" ni ajrata olmasdi. Masalan
   * Telegram ichidagi brauzerda `mediaDevices` yo'q, lekin buni odam
   * qayerdan bilsin?
   *
   * Ilovada (Android) esa yashiriladi: u yerda hali yozib olish moduli
   * yo'q, va har ekranda foydasiz tugma turishi ortiqcha.
   */
  visible: boolean;
  state: VoiceInputState;
  error: VoiceError | null;
  start: () => void;
  stop: () => void;
  clearError: () => void;
}

/**
 * Eng uzun yozuv.
 *
 * Tugma tasodifan bosilib qolsa mikrofon abadiy ochiq turmasligi kerak:
 * tanish xizmati pullik va uzun yozuv ko'proq turadi.
 */
const MAX_RECORDING_MS = 60_000;

/** Brauzerda yozib olish mumkinmi. */
export function isVoiceInputSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const recorder = (window as unknown as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } })
    .MediaRecorder;
  if (!recorder || !navigator.mediaDevices?.getUserMedia) return false;
  return pickMimeType((type) => Boolean(recorder.isTypeSupported?.(type))) !== null;
}

export function useVoiceInput({ kind, accountType, token, onResult }: VoiceInputOptions): VoiceInput {
  const [supported] = useState(isVoiceInputSupported);
  const [state, setState] = useState<VoiceInputState>('idle');
  const [error, setError] = useState<VoiceError | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Komponent yopilgach natijani qo'ymaslik uchun — modal yopilganda
  // so'rov hali kelayotgan bo'lishi mumkin.
  const aliveRef = useRef(true);

  // Natijani qabul qiluvchi HAR DOIM eng oxirgisi bo'lishi kerak.
  // Yozish boshlangan paytdagi nusxa saqlanib qolsa, odam gapirib
  // turganda formaga yozgan o'zgarishlari yo'qolardi: eski funksiya eski
  // qiymatlarni ko'rib turadi.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  /**
   * Mikrofonni bo'shatish.
   *
   * Trek to'xtatilmasa brauzerda yozuv belgisi yonib turaveradi va
   * foydalanuvchi "meni tinglashyapti" deb o'ylaydi. Shuning uchun bu
   * har qanday yakunda — muvaffaqiyat, xato, komponent yopilishi —
   * chaqiriladi.
   */
  const releaseMicrophone = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    recorderRef.current = null;
    recorder?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      releaseMicrophone();
    };
  }, [releaseMicrophone]);

  const handleRecorded = useCallback(
    async (blob: Blob) => {
      if (!isWorthSending(blob.size)) {
        // Juda qisqa — tugma tasodifan bosilgan. Xato ko'rsatmaymiz, chunki
        // odam hech narsa aytmagan; shunchaki tinch qaytamiz.
        if (aliveRef.current) setState('idle');
        return;
      }

      try {
        const text = await transcribe(blob, token);
        if (!aliveRef.current) return;

        if (!text.trim()) {
          setState('idle');
          setError({ key: 'voice.notRecognised' });
          return;
        }

        const intent = await understand(text, kind, { accountType, token });
        if (!aliveRef.current) return;

        setState('idle');
        onResultRef.current(intent);
      } catch (e) {
        if (!aliveRef.current) return;
        setState('idle');
        // Server xabari allaqachon foydalanuvchi tilida — uni shundayligicha
        // ko'rsatamiz. Tarmoq uzilgan bo'lsa xabar texnik bo'ladi, shunda
        // o'zimizning matnimiz ishlatiladi.
        const message = e instanceof Error ? e.message : '';
        setError(message ? { message } : { key: 'voice.failed' });
      }
    },
    [accountType, kind, token],
  );

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    // `onstop` ichida blob yig'iladi — shuning uchun bu yerda faqat to'xtatamiz.
    recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      // Jim qaytmaymiz: sababni aytish kerak.
      setError({ key: 'voice.unsupportedBrowser' });
      return;
    }
    if (state !== 'idle') return;
    setError(null);

    const MediaRecorderCtor = (window as unknown as { MediaRecorder: typeof MediaRecorder }).MediaRecorder;
    const mimeType = pickMimeType((type) =>
      Boolean((MediaRecorderCtor as unknown as { isTypeSupported?: (t: string) => boolean }).isTypeSupported?.(type)),
    );

    // `getUserMedia` ENG BIRINCHI chaqiriladi. Undan oldin `await` qo'ysak,
    // bosish ishorasi bilan bog'liqlik uzilib, brauzer so'rovni ko'rsatmay
    // qo'yishi mumkin — aynan shu "ruxsat so'ramayapti" holatini keltirib
    // chiqaradi.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      // Sabab yiqilgandan KEYIN aniqlanadi. Uchala holat ham tashqaridan
      // "brauzer so'ramayapti" bo'lib ko'rinadi, lekin yo'llari boshqa:
      // mikrofonsiz qurilmada ruxsat so'rash ma'nosiz, bloklangan holatda
      // esa sozlamadan ochish kerak.
      const name = e instanceof Error ? e.name : '';
      const permission = await micPermission();
      setError({
        key: describeMediaError(name, permission),
        detail: `${name || 'xato'} / ruxsat: ${permission}`,
      });
      return;
    }

    if (!aliveRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const recorder = new MediaRecorderCtor(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorderRef.current = recorder;

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType ?? 'audio/webm' });
      chunksRef.current = [];
      releaseMicrophone();
      if (aliveRef.current) setState('working');
      void handleRecorded(blob);
    };

    recorder.start();
    setState('recording');

    timerRef.current = setTimeout(() => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    }, MAX_RECORDING_MS);
  }, [handleRecorded, releaseMicrophone, state, supported]);

  return {
    supported,
    visible: supported || Platform.OS === 'web',
    state,
    error,
    start: useCallback(() => void start(), [start]),
    stop,
    clearError: useCallback(() => setError(null), []),
  };
}
