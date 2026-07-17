import { realtimeStatus } from '../realtimeStatus';

describe('realtimeStatus', () => {
  afterEach(() => {
    realtimeStatus.setConnected(false);
  });

  it('boshlang‘ich holat: ulanmagan', () => {
    expect(realtimeStatus.isConnected()).toBe(false);
  });

  it('setConnected holatni o‘zgartiradi va obunachini chaqiradi', () => {
    const listener = jest.fn();
    const unsubscribe = realtimeStatus.subscribe(listener);

    realtimeStatus.setConnected(true);
    expect(realtimeStatus.isConnected()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('bir xil qiymat qayta o‘rnatilsa obunachi chaqirilmaydi', () => {
    const listener = jest.fn();
    const unsubscribe = realtimeStatus.subscribe(listener);

    realtimeStatus.setConnected(false);
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('obunadan chiqqan listener boshqa chaqirilmaydi', () => {
    const listener = jest.fn();
    const unsubscribe = realtimeStatus.subscribe(listener);
    unsubscribe();

    realtimeStatus.setConnected(true);
    expect(listener).not.toHaveBeenCalled();
  });
});
