import { checkPin, clearPin, hasPin, savePin } from '../pinStorage';

// Har testdan oldin toza holat.
beforeEach(async () => {
  await clearPin();
});

describe('ilova-qulfi PIN saqlash', () => {
  it('boshda PIN yo‘q', async () => {
    expect(await hasPin()).toBe(false);
  });

  it('saqlangach PIN bor bo‘ladi', async () => {
    await savePin('1234');
    expect(await hasPin()).toBe(true);
  });

  it('to‘g‘ri PIN tasdiqlanadi', async () => {
    await savePin('1234');
    expect(await checkPin('1234')).toBe(true);
  });

  it('noto‘g‘ri PIN rad etiladi', async () => {
    await savePin('1234');
    expect(await checkPin('0000')).toBe(false);
  });

  it('PIN OCHIQ saqlanmaydi — faqat tuz+xesh', async () => {
    await savePin('1234');
    const SecureStore = require('expo-secure-store');
    const raw = await SecureStore.getItemAsync('debt-book.app-pin.v1');
    expect(raw).not.toBeNull();
    // Xom qiymatda "1234" ochiq ko‘rinmasligi kerak.
    expect(raw).not.toContain('1234');
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('salt');
    expect(parsed).toHaveProperty('hash');
  });

  it('turli PIN — turli xesh', async () => {
    const SecureStore = require('expo-secure-store');
    await savePin('1111');
    const a = JSON.parse(await SecureStore.getItemAsync('debt-book.app-pin.v1')).hash;
    await clearPin();
    await savePin('2222');
    const b = JSON.parse(await SecureStore.getItemAsync('debt-book.app-pin.v1')).hash;
    expect(a).not.toBe(b);
  });

  it('o‘chirilgach qayta PIN yo‘q bo‘ladi', async () => {
    await savePin('1234');
    await clearPin();
    expect(await hasPin()).toBe(false);
    expect(await checkPin('1234')).toBe(false);
  });
});
