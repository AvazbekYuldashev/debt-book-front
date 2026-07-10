# Real-time bildirishnomalar (WebSocket) — backend kontrakti

**STATUS (2026-07-10): ISHLAYAPTI.** Backend implementatsiyasi VPS'dagi jonli
repo'da (`/home/Desktop/backend`, lokal commit `86dfcb3`): `notification/ws/`
paketi (NotificationWsHandler + NotificationWsConfig), security whitelist'da
`/ws/**`, `createTransactionNotification` saqlagach push. Apache'da
`proxy_wstunnel` + `/ws` proxy (project.test-le-ssl.conf). E2E tekshirilgan:
`wss://pul-hisob.uz/ws/notifications` orqali noto'g'ri token → close 1008,
to'g'ri token → AUTH_OK + PING/PONG. Backend commit'lar GitHub'da ham bor
(`AvazbekYuldashev/Debt-Book` master = 86dfcb3) — server, GitHub va lokal
klon sinxron.

Frontend (`src/realtime/notificationsSocket.ts`) shu kontrakt bo'yicha ulanadi.
Backend WS bermasa hech narsa buzilmaydi: mijoz backoff bilan qayta urinadi,
bu vaqtda REST polling (25–30s) ishlayveradi. Backend WS'ni qo'shgani zahoti
frontend avtomatik real-time'ga o'tadi (kod o'zgarishisiz), polling esa 180s
"sug'urta" rejimiga siyraklashadi.

## Protokol

- **Endpoint:** `GET /ws/notifications` (WebSocket upgrade). Web'da nisbiy
  (Apache proxy orqali), mobil'da `ws://138.249.7.224/ws/notifications`.
- **Auth:** ulanish ochilgach mijoz **birinchi** frame sifatida yuboradi:
  `{"type":"AUTH","token":"<jwt>"}`. Token URL'da YUBORILMAYDI (access-log'ga
  tushmasligi uchun). Server 5 soniya ichida to'g'ri AUTH olmasa ulanishni yopadi.
- **Server → mijoz frame'lari:**
  - `{"type":"AUTH_OK"}` — token qabul qilindi;
  - `{"type":"NOTIFICATION"}` — shu profilga yangi bildirishnoma yozildi
    (payload shart emas: mijoz REST orqali ro'yxat/badge'ni qayta so'raydi);
  - `{"type":"PONG"}` — heartbeat javobi.
- **Mijoz → server:** `{"type":"PING"}` har 30s. 75s davomida serverdan hech
  narsa kelmasa mijoz ulanishni "o'lik" deb yopadi va qayta ulanadi.

## Spring backend skeleti

`pom.xml`: `spring-boot-starter-websocket`.

```java
@Configuration
@EnableWebSocket
public class WsConfig implements WebSocketConfigurer {
    private final NotificationWsHandler handler;
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/notifications").setAllowedOrigins("*");
    }
}
```

```java
@Component
public class NotificationWsHandler extends TextWebSocketHandler {
    // profileId -> sessiyalar (bir foydalanuvchi bir nechta qurilma)
    private final Map<String, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        JsonNode frame = mapper.readTree(message.getPayload());
        String type = frame.path("type").asText();
        if ("AUTH".equals(type)) {
            String profileId = jwtService.validateAndGetProfileId(frame.path("token").asText());
            if (profileId == null) { session.close(CloseStatus.POLICY_VIOLATION); return; }
            session.getAttributes().put("profileId", profileId);
            sessions.computeIfAbsent(profileId, k -> ConcurrentHashMap.newKeySet()).add(session);
            session.sendMessage(new TextMessage("{\"type\":\"AUTH_OK\"}"));
        } else if ("PING".equals(type)) {
            session.sendMessage(new TextMessage("{\"type\":\"PONG\"}"));
        }
    }

    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Object profileId = session.getAttributes().get("profileId");
        if (profileId != null) sessions.getOrDefault(profileId, Set.of()).remove(session);
    }

    /** NotificationService bildirishnoma YARATGAN joyda chaqiriladi. */
    public void notifyProfile(String profileId) {
        for (WebSocketSession s : sessions.getOrDefault(profileId, Set.of())) {
            try { s.sendMessage(new TextMessage("{\"type\":\"NOTIFICATION\"}")); } catch (Exception ignored) {}
        }
    }
}
```

Security config'da `/ws/**` permitAll (auth WS ichida birinchi frame orqali).

## Apache (VPS) proxy

WebSocket upgrade uchun (mod_proxy_wstunnel yoqilgan bo'lsin):

```apache
ProxyPass        /ws/ ws://localhost:8080/ws/
ProxyPassReverse /ws/ ws://localhost:8080/ws/
```

`a2enmod proxy_wstunnel` + Apache restart.

## Diqqat

Production backend'dagi notification moduli (REST `/api/v1/notification*`)
lokal klonlar va GitHub'dagi `Debt-Book` repo'sida YO'Q — u faqat VPS'dagi
ishlab turgan nusxada. WS'ni qo'shishdan oldin o'sha jonli kodni repo'ga
commit qilib oling, aks holda eski kloddan deploy notification'ni o'chirib
yuboradi.
