import { fileNameFor, isWorthSending, pickMimeType, PREFERRED_MIME_TYPES } from '../voiceFormat';

describe('pickMimeType', () => {
  it('brauzer qabul qilgan birinchi formatni tanlaydi', () => {
    expect(pickMimeType(() => true)).toBe(PREFERRED_MIME_TYPES[0]);
  });

  it('opus bo\'lmasa keyingisiga tushadi', () => {
    // Safari webm bermaydi, mp4 beradi.
    const onlyMp4 = (type: string) => type === 'audio/mp4';
    expect(pickMimeType(onlyMp4)).toBe('audio/mp4');
  });

  it('hech biri mos kelmasa null', () => {
    // null "formatsiz yozamiz" emas, "bu brauzerda yozib bo'lmaydi" degani —
    // tugma umuman ko'rsatilmaydi.
    expect(pickMimeType(() => false)).toBeNull();
  });

  it('noma\'lum turga istisno ko\'targan brauzerni yiqitmaydi', () => {
    const throwsOnFirst = (type: string) => {
      if (type !== 'audio/mp4') throw new TypeError('not supported');
      return true;
    };
    expect(pickMimeType(throwsOnFirst)).toBe('audio/mp4');
  });
});

describe('fileNameFor', () => {
  it('kengaytma formatdan olinadi', () => {
    expect(fileNameFor('audio/webm;codecs=opus')).toBe('ovoz.webm');
    expect(fileNameFor('audio/mp4')).toBe('ovoz.m4a');
    expect(fileNameFor('audio/ogg;codecs=opus')).toBe('ovoz.ogg');
    expect(fileNameFor('audio/mpeg')).toBe('ovoz.mp3');
  });

  it('format noma\'lum bo\'lsa ham tanish kengaytma qoladi', () => {
    // `.bin` yuborsak tanish xizmati faylni tushunmay qolishi mumkin.
    expect(fileNameFor(null)).toBe('ovoz.webm');
    expect(fileNameFor('')).toBe('ovoz.webm');
    expect(fileNameFor('nimadir/boshqa')).toBe('ovoz.webm');
  });

  it('katta harf va bo\'shliq xalaqit bermaydi', () => {
    expect(fileNameFor(' AUDIO/MP4 ; codecs=mp4a ')).toBe('ovoz.m4a');
  });
});

describe('isWorthSending', () => {
  /**
   * Tugma tasodifan bosilganda pullik xizmatga so'rov ketmasligi kerak —
   * javob baribir bo'sh keladi.
   */
  it('juda kichik yozuv yuborilmaydi', () => {
    expect(isWorthSending(0)).toBe(false);
    expect(isWorthSending(500)).toBe(false);
  });

  it('haqiqiy yozuv yuboriladi', () => {
    expect(isWorthSending(1200)).toBe(true);
    expect(isWorthSending(40000)).toBe(true);
  });
});
