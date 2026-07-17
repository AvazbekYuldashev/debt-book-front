import { toWebSocketUrl } from '../wsUrl';

describe('toWebSocketUrl', () => {
  it('http -> ws', () => {
    expect(toWebSocketUrl('http://localhost:8080', '/ws/notifications')).toBe(
      'ws://localhost:8080/ws/notifications',
    );
  });
  it('https -> wss', () => {
    expect(toWebSocketUrl('https://api.example.uz', '/ws/notifications')).toBe(
      'wss://api.example.uz/ws/notifications',
    );
  });
  it('trailing slash tozalanadi', () => {
    expect(toWebSocketUrl('http://138.249.7.224/', '/ws/notifications')).toBe(
      'ws://138.249.7.224/ws/notifications',
    );
  });
  it('path boshida slash bo‘lmasa qo‘shiladi', () => {
    expect(toWebSocketUrl('http://host', 'ws/notifications')).toBe('ws://host/ws/notifications');
  });
});
