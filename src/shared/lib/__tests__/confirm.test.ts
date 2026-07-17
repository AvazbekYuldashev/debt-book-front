import { Platform } from 'react-native';
import { confirmAction } from '../confirm';

// confirm.ts'dagi data-integrity regressiyasini qo'riqlaydigan testlar.
describe('confirmAction (web)', () => {
  const original = (globalThis as any).confirm;

  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'web', configurable: true });
  });

  afterEach(() => {
    (globalThis as any).confirm = original;
  });

  it('confirm() true qaytarsa onConfirm chaqiriladi', () => {
    (globalThis as any).confirm = () => true;
    const onConfirm = jest.fn();
    confirmAction('o‘chirilsinmi?', onConfirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('confirm() false qaytarsa onConfirm chaqirilmaydi', () => {
    (globalThis as any).confirm = () => false;
    const onConfirm = jest.fn();
    confirmAction('o‘chirilsinmi?', onConfirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('REGRESSION: confirm() mavjud bo‘lmasa, onConfirm chaqirilmaydi (fail-safe)', () => {
    (globalThis as any).confirm = undefined;
    const onConfirm = jest.fn();
    confirmAction('o‘chirilsinmi?', onConfirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
