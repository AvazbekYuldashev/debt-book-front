import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearPendingIntent,
  resetPendingVoiceSession,
  savePendingIntent,
  takePendingIntent,
  watchForegroundForPendingVoice,
} from '../pendingVoice';
import type { VoiceIntent } from '../../api/voice';

/**
 * Tanilgan gap saqlanib turishi kerak, toki yozuv saqlanmaguncha.
 *
 * SABAB PUL: ovozni yuborish har safar to'lanadi (tanish xizmati + model).
 * Modal ochiq turganda dasturdan chiqib kirilsa, React holati yo'qolar va
 * odam aynan shu gapni qaytadan aytishga majbur bo'lardi.
 */
const KEY = 'voice.pendingIntent';

const intent = (over: Partial<VoiceIntent> = {}): VoiceIntent => ({
  text: 'nonga',
  understood: true,
  amount: 50000,
  ...over,
});

beforeEach(async () => {
  await AsyncStorage.clear();
  resetPendingVoiceSession();
  jest.restoreAllMocks();
});

describe('pendingVoice', () => {
  it('saqlangan gap tiklanadi', async () => {
    await savePendingIntent(intent());

    const restored = await takePendingIntent();
    expect(restored?.amount).toBe(50000);
    expect(restored?.text).toBe('nonga');
  });

  /**
   * Seansda BIR MARTA: aks holda ro'yxatga har qaytganda oyna qayta
   * ochilib, odamni qamab qo'yardi.
   */
  it('bir seansda faqat bir marta tiklanadi', async () => {
    await savePendingIntent(intent());

    expect(await takePendingIntent()).not.toBeNull();
    expect(await takePendingIntent()).toBeNull();
  });

  /** Sahifa yangilanishi = yangi seans, ya'ni tiklash yana ishlaydi. */
  it('yangi seansda yana tiklanadi', async () => {
    await savePendingIntent(intent());
    await takePendingIntent();

    resetPendingVoiceSession();
    expect(await takePendingIntent()).not.toBeNull();
  });

  /**
   * Bir hafta oldingi gap o'z-o'zidan ochilsa, odam uni bugungi deb
   * o'ylab saqlab yuborishi mumkin.
   */
  it('muddati otgan gap tiklanmaydi', async () => {
    await savePendingIntent(intent());
    resetPendingVoiceSession();

    const soon = Date.now() + 31 * 60 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(soon);

    expect(await takePendingIntent()).toBeNull();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  /** Tushunilmagan gapdan yozuv yasab bo'lmaydi - uni tiklashning ma'nosi yo'q. */
  it('tushunilmagan gap tiklanmaydi', async () => {
    await savePendingIntent(intent({ understood: false }));
    resetPendingVoiceSession();

    expect(await takePendingIntent()).toBeNull();
  });

  it('buzuq yozuv jimgina tashlanadi', async () => {
    await AsyncStorage.setItem(KEY, '{bu json emas');

    expect(await takePendingIntent()).toBeNull();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  /** Saqlangandan yoki bekor qilingandan keyin qayta ochilmasin. */
  it('tozalangach tiklanmaydi', async () => {
    await savePendingIntent(intent());
    await clearPendingIntent();
    resetPendingVoiceSession();

    expect(await takePendingIntent()).toBeNull();
  });

  it('hech narsa saqlanmagan bolsa bosh qaytadi', async () => {
    expect(await takePendingIntent()).toBeNull();
  });
});

/**
 * EKRAN QULFI: qulflanganda RootNavigator faqat PIN oynasini qaytaradi,
 * ya'ni butun ekran daraxti yechiladi. Qulf ochilgach ekranlar noldan
 * yig'iladi va tiklash aynan o'shanda kerak.
 *
 * Seans bayrog'i esa o'sha paytgacha sarflangan bo'lardi: dastur ishga
 * tushganda bir marta o'qilib "tiklandi" deb belgilanardi va qulfdan
 * keyin gap qayta ochilmasdi - odam uni qaytadan aytishga majbur bo'lardi.
 */
describe('fonga chiqib qaytish', () => {
  /** Platformaga qarab "dastur ko'rindi" hodisasini yuboradi. */
  const foreground = (): (() => void) => {
    if (Platform.OS === 'web') {
      const stop = watchForegroundForPendingVoice();
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      return stop;
    }

    let notify: ((state: string) => void) | undefined;
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _event: string,
      cb: (state: string) => void,
    ) => {
      notify = cb;
      return { remove: jest.fn() };
    }) as never);

    const stop = watchForegroundForPendingVoice();
    notify?.('active');
    spy.mockRestore();
    return stop;
  };

  it('qulfdan keyin gap yana tiklanadi', async () => {
    await savePendingIntent(intent());

    // Dastur ishga tushdi: bayroq sarflandi.
    expect(await takePendingIntent()).not.toBeNull();
    expect(await takePendingIntent()).toBeNull();

    // Fonga chiqib qaytdi - qulf ochilgandek.
    const stop = foreground();
    expect(await takePendingIntent()).not.toBeNull();
    stop();
  });

  /** Saqlangan yozuv uchun tiklanadigan narsa yo'q. */
  it('tozalangan gap qulfdan keyin ham ochilmaydi', async () => {
    await savePendingIntent(intent());
    await clearPendingIntent();

    const stop = foreground();
    expect(await takePendingIntent()).toBeNull();
    stop();
  });
});
