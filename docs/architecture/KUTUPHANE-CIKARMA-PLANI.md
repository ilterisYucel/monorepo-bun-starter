---
status: active
space: architecture
tags: [plan, kutuphane, ekstraksiyon, lisanslama, ws-tunnel, tamper-logger]
review_date: 2026-09-01
---

# Kütüphane Çıkarma Planı — ws-tunnel + tamper-logger

**Amaç:** `ws-tunnel` (çoklanmış WebSocket tüneli — frame codec + FieldConnector + TunnelClient + session gateway/proxy) ve `tamper-logger` (tamper kanıtlı, imza zincirli log altyapısı) modüllerini bu monorepo'dan bağımsız kütüphaneler olarak çıkarmak, ayrı lisanslamak ve gerekirse ticari olarak satmak.

**Durum:** **FAZ A TAMAMLANDI (2026-09-01)** — **FAZ B TEKNİK KALEMLERİ DE TAMAMLANDI (2026-09-01)**: shared-types tip bağımlılığı SÖKÜLDÜ (jenerik `TunnelRole`/`TunnelUser`/`TunnelTelemetryPoint` + monorepo `session-user-map` eşleme katmanı) ve paket içi loopback demo eklendi (`src/demo/` + `examples/loopback-demo.mjs` + README). Faz B'den kalan yalnızca yayın/lisans işleri: LICENSE/EULA kararı, CHANGELOG, CI publish kanalı (§8 — ticari kararlar, ertelendi). — `packages/ws-tunnel` (`@gd-monorepo/ws-tunnel`) monorepo içinde bağımsız jenerik paket olarak ayrıldı: codec, kontrol mesaj protokolü, FieldConnector, TunnelClient, session store/server, session gateway, TunnelProxy + kendi `errors`/`logger`/`channel`/`token`/`audit`/`snapshot` sözleşmeleri. `tamper-logger` kısmı TAMAMLANDI (2026-08-31 — `packages/tamper-logger`). Monorepo adapter'leri: `ContainerProxyFieldChannel`, `FastifyStreamSink`, `JoseTokenSigner`, `SessionAudit` (IAuditSink). **Sapmalar:** `tunnel.spec.ts` monorepo'da kaldı (ürün entegrasyon kapısı); `session-audit.ts` monorepo'da kaldı (PG implementasyonu). Faz B (yayınlama — yalnızca ticari/içerik kaldı) ve Faz C (ayrı repo) AÇIK — açık kararlar (§8) doldurulmadan başlamaz. ws-tunnel bağımlılığı: `ws` + `zod` + `@gd-monorepo/result` (yaprak paket — 2026-09-01'de ayrıldı; paket tek başına yayınlanacaksa result da yayınlanır).

---

## 1. Mevcut durum ve kuplaj analizi (2026-09-01 tazelendi)

| Kontrol | Sonuç |
|---|---|
| Domain kuplajı | `packages/platform/container-access/src/tunnel/` (codec + tipler — 2026-08-31'de core'dan taşındı) içinde BSC/battery/container-web gibi alan referansı **YOK**; yalnızca `@gd-monorepo/shared-types` tip importları var. Tasarım §12.3: "tunnel codec'i generic HTTP+WS reverse proxy'dir — container-web'e özgü değildir" |
| Bağımlılık lisansları | Bun store taramasında **GPL/AGPL/LGPL yok** — tüm bağımlılıklar MIT/ISC/BSD/Apache (copyleft bulaşması yok; nihai karar yayın öncesi lisans denetimiyle) |
| DI sözleşmeleri | `ISocketClient`, `ILogSink`, `SqlExecutor` gibi arayüzler zaten jenerik; Fastify/PG/Redis adapter katmanında |
| Bilinen kuplajlar | (1) `container-session/tunnel-proxy.ts` — `ServerResponse` (node:http) üzerinden Fastify `reply.raw`'a yazıyor → **`IStreamSink` soyutlaması gerekli**; (2) `field-connector/ws-socket-client.ts` web-service içinde → tünel paketine taşınacak; (3) tünel kontrol mesaj tipleri `shared-types/src/field-connector.ts` içinde → yeni pakete taşınacak; (4) tünel frame'leri `ContainerProxy`'nin WS kanalından geçiyor (`sendControl`/`sendBinary` + `onControlMessage`/`onBinaryFrame`) → **kanal arayüzü** (sendText/sendBinary + onMessage/onBinaryFrame) soyutlaması gerekli — monorepo ContainerProxy adapter'ini sağlar |

---

## 2. Hukuki kontrol listesi (açık sorular — avukata sorulacak)

1. **IP sahipliği:** Kod hangi sözleşme ilişkisi altında yazıldı? İş sözleşmesiyle yazıldıysa haklar genelde işverenindir. Karar: kütüphane IP'sinin devri/yetkisi netleştirilmeli.
2. **Taban şablon lisansı:** Repo `monorepo-bun-starter` tabanlı — tabanın lisansı/orijini kontrol edilmeli. Tunnel/logger bu projede yeni yazıldı (Faz 0–6), ancak temel katmanlar türetilmiş olabilir.
3. **Repo gizliliği:** GitHub repo **public ise** kaynak zaten açıktır — telif hakkı korunur ama know-how gizliliği yoktur; gizli satış hedefleniyorsa repo private'a alınmalı (kütüphane kodu ayrı private repo'ya taşınmadan ÖNCE).
4. **Müşteri sözleşmeleri:** Customer variant'larda (config/plugin paketleri) teslim edilen kaynak hakları — satılacak çekirdeğin müşterilere devredilmediği doğrulanmalı.
5. **Satış yükümlülükleri:** Güvenlik ürünü (tamper log) satışı NIS-2/uyumluluk beyanı, garanti ve sorumluluk maddeleri getirir; lisans metni (EULA) hazırlanmalı.

---

## 3. Dosya taşıma haritası

### 3.1 Yeni paket: `ws-tunnel`

| Kaynak (2026-09-01 güncel yol) | Hedef içerik | Not |
|---|---|---|
| `packages/platform/container-access/src/tunnel/frame-codec.ts` + `types.ts` + `index.ts` | Frame codec + tipler (9 bayt başlık, FIN/RST/WS_OP) | Birebir taşınır; `Result<_,FrameDecodeError>` korunur (18 test) |
| `packages/shared-types/src/field-connector.ts` | Kontrol mesaj tipleri + zod şemaları (register…telemetry-query/result, stream-*, open-session/*) | Yeni pakete taşınır; shared-types geriye dönük re-export edebilir (27 test) |
| `services/web-service/src/infrastructure/field-connector/field-connector.ts` | WS istemcisi + durum makinesi (offline→connecting→registered→connected↔backoff) | Container-spesifik parçalar (`pushSnapshot`, `telemetry-query` aboneliği) **soyutlanır**: `ISnapshotSource` / `IMessageSubscriber` enjeksiyonu (53 + 7 spec testi) |
| `services/web-service/src/infrastructure/field-connector/tunnel-client.ts` | Tünel istemcisi (stream multiplex, pencere, çift upstream, WS köprüsü) | Birebir taşınır (25 test) |
| `services/web-service/src/infrastructure/field-connector/ws-socket-client.ts` + `interfaces.ts` | `ISocketClient` kontratı + ws uygulaması | web-service'ten çıkarılır (`adapters.test.ts` WsSocketClient/Factory kısmı — 9 test) |
| `services/web-service/src/infrastructure/field-connector/reconnect-delay.ts` | Backoff hesabı | Birebir (13 test) |
| `services/web-service/src/infrastructure/field-connector/container-session-server.ts` | `open-session` işleyici (konteyner tarafı session store beslemesi) | `ITokenSigner` enjeksiyonuyla jenerikleştirilir (3 test) |
| `services/web-service/src/infrastructure/field-connector/session-store.ts` | `ContainerSessionStore` (konteyner tarafı oturum JWT'si, TTL/idle sweep) | `ContainerSessionTokenAdapter` için `ITokenSigner` enjeksiyonu (10 test) |
| `services/web-service/src/infrastructure/container-session/session-gateway.ts` + `field-session-store.ts` + `session-audit.ts` | Field tarafı oturum yönetimi | `session-audit` için `IAuditSink` arayüzü (PG bağımlılığı dışarıda) (11 test) |
| `services/web-service/src/infrastructure/container-session/tunnel-proxy.ts` | Field tarafı HTTP/WS proxy | **Fastify kuplajı çözülür:** `IStreamSink` (writeHead/write/end) + `IHijack` arayüzü; Fastify adapter'i monorepo'da kalır (34 test) |
| `services/web-service/src/infrastructure/container-session/tunnel.spec.ts` | Gerçek-WS uçtan uca (K3.1-K3.3) | Paket içinde kalır (4 test) |
| — (YENİ sözleşme) **kanal arayüzü** | `sendText`/`sendBinary` + `onMessage`/`onBinaryFrame` — tünelin WS taşıyıcısından bağımsızlığı | `ContainerProxy`'nin Faz 3 kanal metotları (`sendControl`/`sendBinary`/`onControlMessage`/`onBinaryFrame`) bu kontratın monorepo adapter'ine dönüşür; `FieldConnector` da aynı kontratı uygular |

### 3.2 Yeni paket: `tamper-logger` — ✅ TAMAMLANDI (2026-08-31)

`packages/tamper-logger` bağımsız jenerik paket olarak yayınlandı (platform-paket-yapisi.md Aşama 2.5): `TamperLogger` + pipeline + sink'ler + `verifyChain` + signing key; eventCode serbest string + `eventCodeValidator` enjeksiyonu; GD-PMS olay sözlüğü (`LOG_EVENT_CODES`/`isLogEventCode`) `platform/logging`'e taşındı. `tools/verify-log.mjs` pakete eşlik ediyor. (14 test dosyası, 104 test — test-envanteri.md bölüm 6.)

### 3.3 Monorepo'da kalan (domain — satış kapsamı dışı)

`ContainerProxy` (ws-tunnel kanal kontratının monorepo adapter'i olur — Faz 3 `sendControl`/`sendBinary`/observer metotları bu kontrata eşlenir), `container-ws-routes.ts`, `session-routes.ts` (Fastify route'ları), `TelemetryQueryResponder`/`TelemetrySeriesSource`, `RealtimeSnapshotSource`, `rbac.ts` (sessionAuthenticator), `realtime/ws-routes.ts` (tünel oturum token kabulü), `auth-routes.ts` (tunnel bayrağı), container-web `session-auth`, `RealtimeManager`, cihaz alarm sistemi, Modbus/CANbus, simülatörler, EPIAŞ plugin'leri, field/container UI'lar, maneuver/komut sistemleri. Canlı kanıtlar: `e2e/tunnel.spec.ts`, `e2e/field-flow.spec.ts`, `tools/tunnel-demo.mjs`, `tools/field-connector-demo.mjs`.

---

## 4. Faz A — De-kuplaj (teknik) — ✅ UYGULANDI (2026-09-01)

1. **`IStreamSink` soyutlaması:** ✅ `ws-tunnel/src/proxy/stream-sink.ts` (`status/header/write/end/destroy/onClose`); monorepo `FastifyStreamSink` (web-service `container-session/fastify-stream-sink.ts`).
2. **Kanal arayüzü soyutlaması:** ✅ `ws-tunnel/src/channel` — `ISocketClient`/`ISocketClientFactory`/`WsSocketClient` + `ITunnelChannel` (konteyner) + `IFieldChannel` (field, containerId'li + `isConnected`); monorepo `ContainerProxyFieldChannel` adapter'i.
3. **Diğer enjeksiyon noktaları:** ✅ `ITokenSigner` (monorepo `JoseTokenSigner`), `IAuditSink` (monorepo `SessionAudit`), `ISnapshotSource` (monorepo `RealtimeSnapshotSource`), `ILogger` (TamperLogger yapısal uyumlu).
4. **Paket iskeleti:** ✅ `packages/ws-tunnel` (tamper-logger kalıbı; tsconfig composite — testler typecheck dışı).
5. **Tip taşıma:** ✅ `shared-types/src/field-connector.ts` → `ws-tunnel/src/protocol/messages.ts`; tüm tüketiciler tek seferde güncellendi (re-export köprüsü YOK).
6. **Bağımlılık yönleri:** ✅ `ws-tunnel` → `ws`, `zod`, `@gd-monorepo/result` — shared-types type-only bağımlılığı DA SÖKÜLDÜ (jenerik tipler + `session-user-map`); `core`/`platform-logging` bağımlılığı KALDIRILDI.
7. **Test taşıma:** ✅ 240 test ws-tunnel'da; web-service kalan 420; tüm monorepo 1463/1463 yeşil (2026-09-01).
8. **Versiyonlama:** ✅ `0.1.0`; monorepo içi tüketim source alias (tsconfig paths + vitest/vite alias).

## 5. Faz B — Yayınlama

1. `LICENSE` (modele göre: MIT / özel EULA), `README` + minimal örnek uygulama (loopback demo), CHANGELOG.
2. CI publish işi (npm publish / private registry — §8 kararına göre).
3. Monorepo tüketiciye döner; HMR için alias opsiyonu dokümante edilir.

## 6. Faz C (opsiyonel) — Kapalı ticari lisans

`ws-tunnel` paketi **ayrı private repo'ya** taşınır; monorepo yalnızca tüketici olur. Repo ayrımı Faz A'dan önce yapılmalıdır (geçmiş/gizlilik temizliği).

## 7. Doğrulama kapıları (her fazda)

- Taşınan testler + monorepo testleri yeşil (web-service kalan — şu an 569/569; `platform-container-access` kalan — frame-codec hariç; shared-types kalan)
- `nx run-many -t build` yeşil
- Canlı dev stack: field-flow E2E 1/1 (tünel + oturum + telemetri akmaya devam eder)
- Yayın öncesi: lisans denetimi (bun.lock tam tarama), README örneği sıfırdan çalışır

## 8. Açık kararlar (başlamadan ÖNCE doldurulacak)

| # | Karar | Durum |
|---|---|---|
| 1 | Lisans modeli: MIT+destek / kapalı ticari / dual | ☐ |
| 2 | Paket adı/marka | ☐ |
| 3 | Yayın kanalı: public npm / private registry | ☐ |
| 4 | Repo public/private durumu + kütüphane kodu için ayrı repo ihtiyacı (Faz C) | ☐ |
| 5 | Hukuki kontrol listesi (§2) maddeleri avukatla netleşti mi | ☐ |
| 6 | Başlangıç tarihi / kaynak ayırma (bu oturum sonrası) | ☐ |

## 9. Riskler

- **Geriye dönük kırılma:** tip taşıma + import güncellemeleri sırasında monorepo build zincirinin bozulması → geçici re-export stratejisi + faz sonu tam test kapısı.
- **Fastify/kanal soyutlamaları:** `IStreamSink` veya kanal arayüzü sözleşmesi yanlış çizilirse tünel davranışı (backpressure, hijack, text/binary ayrımı) bozulur → mevcut `tunnel.spec.ts` uçtan uca testi + `container-proxy` 52 test + `field-connector` 53 test taşımanın güvencesi.
- **Npm senkronu:** monorepo ile yayınlanan paket sürüm sapması → CI'da semver kontrolü + lock adımı.
- **Gizlilik sızıntısı:** Faz C öncesi repo public kalırsa satış değeri düşer → karar #4 ilk netleştirilecek.

---

**Referanslar:** [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md) (protokol tasarımı), [KONTEYNER-FIELD-BAGLANTI-RAPORU.md](./KONTEYNER-FIELD-BAGLANTI-RAPORU.md) (kırılganlık analizi), [KONTEYNER-UZAKTAN-ERISIM-DOGRULAMA.md](./KONTEYNER-UZAKTAN-ERISIM-DOGRULAMA.md) (faz kanıtları), AGENTS.md (DI/TDD kuralları), [ws-tunnel-kutuphane-yol-haritasi.md](../roadmap/ws-tunnel-kutuphane-yol-haritasi.md) (v1 kütüphane iddiası — jenerikleştirme iş planı: Faz G1-G3).
