import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribe, understand, VoiceIntent, VoiceIntentKind } from '../api/voice';
import { isWorthSending, pickMimeType } from './voiceFormat';

/**
 * Mikrofondan yozib olish va aytilganini tushunish.
 *
 * HOZIRCHA FAQAT BRAUZERDA. Android ilovasida yozib olish uchun alohida
 * native modul kerak, u esa yangi Play Market relizi degani. Shuning uchun
 * bu yerda qurilma qo'llab-quvvatlamasa tugma KO'RSATILMAYDI — ishlamaydigan
 * tugmani ko'rsatib, odamni bosishga majburlagandan ko'ra yo'qligi yaxshi.
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
}

export interface VoiceInputOptions {
  kind: VoiceIntentKind;
  accountType?: string;
  token?: string;
  onResult: (intent: VoiceIntent) => void;
}

export interface VoiceInput {
  supported: boolean;
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
    if (!supported || state !== 'idle') return;
    setError(null);

    const MediaRecorderCtor = (window as unknown as { MediaRecorder: typeof MediaRecorder }).MediaRecorder;
    const mimeType = pickMimeType((type) =>
      Boolean((MediaRecorderCtor as unknown as { isTypeSupported?: (t: string) => boolean }).isTypeSupported?.(type)),
    );

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Ruxsat berilmadi yoki mikrofon yo'q. Ikkalasiga ham bitta xabar:
      // foydalanuvchi uchun farqi yo'q, ikkalasida ham ruxsatni tekshiradi.
      setError({ key: 'voice.permissionDenied' });
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
    state,
    error,
    start: useCallback(() => void start(), [start]),
    stop,
    clearError: useCallback(() => setError(null), []),
  };
}
