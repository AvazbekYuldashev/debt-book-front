import { Platform } from 'react-native';
import { BACKEND_URL } from '../api/config';
import { toWebSocketUrl } from './wsUrl';

// ============================================================
//  Bildirishnomalar WebSocket mijozi.
//
//  BACKEND KONTRAKTI (docs/realtime-notifications.md da to'liq):
//    Endpoint : {ws|wss}://{host}/ws/notifications
//    Auth     : ulanish ochilgach mijoz birinchi frame yuboradi:
//                 {"type":"AUTH","token":"<jwt>"}
//               server token noto'g'ri bo'lsa ulanishni yopadi,
//               to'g'ri bo'lsa {"type":"AUTH_OK"} qaytaradi.
//    Server   : {"type":"NOTIFICATION"}  — yangi bildirishnoma bor
//               {"type":"PONG"}          — heartbeat javobi
//    Mijoz    : {"type":"PING"} har 30s (o'lik ulanishni aniqlash).
//
//  Backend hali WS bermasa ham xavfsiz: ulanish tushadi → backoff bilan
//  qayta uriniladi, bu vaqtda REST polling odatdagidek ishlayveradi.
// ============================================================

export const NOTIFICATIONS_WS_PATH = '/ws/notifications';

const HEARTBEAT_INTERVAL_MS = 30_000;
// Shu muddat davomida serverdan hech narsa kelmasa ulanish "o'lik" deb yopiladi.
const STALE_CONNECTION_MS = 75_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 60_000;
const RECONNECT_JITTER_MS = 1_000;

/** Muhitga qarab WS manzili: web'da nisbiy baza bo'lsa joriy host ishlatiladi. */
export function getNotificationsSocketUrl(): string | null {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.location) return null;
    if (BACKEND_URL) return toWebSocketUrl(BACKEND_URL, NOTIFICATIONS_WS_PATH);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${NOTIFICATIONS_WS_PATH}`;
  }
  return BACKEND_URL ? toWebSocketUrl(BACKEND_URL, NOTIFICATIONS_WS_PATH) : null;
}

interface NotificationsSocketHandlers {
  token: string;
  /** Serverdan NOTIFICATION frame kelganda (query'larni invalidatsiya qilish uchun). */
  onNotification: () => void;
  /** Ulanish holati o'zgarganda (polling oralig'ini moslashtirish uchun). */
  onConnectedChange: (connected: boolean) => void;
}

interface ServerFrame {
  type?: string;
}

/**
 * O'z-o'zini tiklaydigan WS mijoz: auth, heartbeat va eksponensial backoff
 * bilan qayta ulanish shu yerda inkapsulyatsiya qilingan. UI faqat
 * start/stop qiladi.
 */
export class NotificationsSocket {
  private ws: WebSocket | null = null;
  private stopped = false;
  private connected = false;
  private attempt = 0;
  private lastMessageAt = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly handlers: NotificationsSocketHandlers) {}

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    this.teardownSocket();
    this.setConnected(false);
  }

  private connect(): void {
    if (this.stopped) return;
    const url = getNotificationsSocketUrl();
    // Muhit WS'ni qo'llamasa jim qolamiz — polling fallback ishlayveradi.
    if (!url || typeof WebSocket === 'undefined') return;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.lastMessageAt = Date.now();
      this.send({ type: 'AUTH', token: this.handlers.token });
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      this.lastMessageAt = Date.now();
      // Server gapirdi — ulanish haqiqiy (AUTH_OK kelmagan serverlarga ham chidamli).
      this.attempt = 0;
      this.setConnected(true);
      const frame = parseFrame(event.data);
      if (frame?.type === 'NOTIFICATION') {
        this.handlers.onNotification();
      }
    };

    // onerror'dan keyin baribir onclose keladi — qayta ulanish o'sha yerda.
    this.ws.onerror = () => undefined;

    this.ws.onclose = () => {
      this.clearTimers();
      this.ws = null;
      this.setConnected(false);
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastMessageAt > STALE_CONNECTION_MS) {
        // Javobsiz ulanish — yopamiz, onclose qayta ulanishni boshlaydi.
        this.teardownSocket();
        this.setConnected(false);
        if (!this.stopped) this.scheduleReconnect();
        return;
      }
      this.send({ type: 'PING' });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    this.attempt += 1;
    const backoff = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** (this.attempt - 1),
      RECONNECT_MAX_DELAY_MS,
    );
    const delay = backoff + Math.random() * RECONNECT_JITTER_MS;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private send(frame: Record<string, string>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(frame));
      } catch {
        // yuborilmasa heartbeat stale-tekshiruvi ulanishni tiklaydi
      }
    }
  }

  private setConnected(next: boolean): void {
    if (this.connected === next) return;
    this.connected = next;
    this.handlers.onConnectedChange(next);
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private teardownSocket(): void {
    if (!this.ws) return;
    this.ws.onopen = null;
    this.ws.onmessage = null;
    this.ws.onerror = null;
    this.ws.onclose = null;
    try {
      this.ws.close();
    } catch {
      // allaqachon yopilgan
    }
    this.ws = null;
  }
}

function parseFrame(data: unknown): ServerFrame | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? (parsed as ServerFrame) : null;
  } catch {
    return null;
  }
}
