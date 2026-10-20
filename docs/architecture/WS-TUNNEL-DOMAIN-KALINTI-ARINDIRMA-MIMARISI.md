---
status: active
space: architecture
tags: [mimari, ws-tunnel, arindirma, bagimsiz-paket, telemetri, spec]
review_date: 2026-10-16
---

# ws-tunnel Domain Arındırma ve Bağımsız Paket — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ ONAYLANDI (2026-10-16) — geliştirme sürüyor.
> **İlişkili:** [WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md](./WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md) (A8), [KUTUPHANE-CIKARMA-PLANI.md](./KUTUPHANE-CIKARMA-PLANI.md), [../roadmap/ws-tunnel-kutuphane-yol-haritasi.md](../roadmap/ws-tunnel-kutuphane-yol-haritasi.md)

## 1. Amaç ve Bağlam

`packages/ws-tunnel` bugün **domain'e ait** pek çok şeyi taşıyor: telemetri (`TunnelTelemetryPoint`, `telemetry*` mesajları, `ISnapshotSource`, push timer'ı ve aralığı), operasyon mesajları, olay mesajı, domain event code'ları, `container_session`/allowlist domain varsayılanları, sert upstream kuralı, `fieldId` adları ve `@gd-monorepo/result` bağımlılığı. Bu paket **monorepo'dan ayrılıp bağımsız bir proje/ürün olarak** başka uygulamalara import edilecek. Paket **saf transport + oturum + stream** olmalı; domain (telemetri/operasyon/olay) onun **üstünde**, jenerik kontrol kanalını kullanan **tüketici modülünde** yaşamalı.

**Wire uyumu:** JSON frame şekilleri (`type:"telemetry"`, `operation-*`, `event`) **DEĞİŞMEZ** — mevcut v1/v2 tagli deployment'lar aynen çalışmaya devam eder; yalnız bu şekillerin *tip tanımları* paketten tüketiciye taşınır.

### Kapsam

| Katman | Bu SPEC'te |
|:-------|:-----------|
| Telemetri/operation/event'in paketten çıkarılıp tüketiciye taşınması | ✅ dahil |
| `Result` yerel gömme + bağımlılık sınırı (`ws`+`zod`) | ✅ dahil |
| Varsayılan sabit/olay kodu/upstream/`hubId`/demo isim arındırması | ✅ dahil |
| Bağımsız import için d.ts + exports | ✅ dahil |
| Paket ismi/marka, LICENSE, npm registry | ❌ hariç (İP-4) |
| v3 protokol (peerType serbest string + labels) | ❌ hariç (§10 A4) |
| Bootstrap/kimlik (İP-2), host-based erişim (A4) | ❌ hariç (ayrı SPEC) |

## 2. Kararlar (kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Telemetri + operation + `EventMessage` paketten **çıkar** | Tipler+şemalar tüketici modülüne; paket bunları bilmez |
| K2 | `Result` + hata taksonomisi **yerel gömülür** | `@gd-monorepo/result` bağımlılığı çıkar; paket bağımlılığı yalnız `ws`+`zod` |
| K3 | `fieldId` → **`hubId`** | Paket + tüketici çağrı siteleri; DB kolonu değişmez |
| K4 | Upstream kuralı **injectable** (`routeUpstream`) | Varsayılan = bugünkü `/api/*`,`/ws/*` kuralı |
| K5 | Cookie varsayılanı **nötr** (`tunnel_session`) | Tüketici kendi cookie adını enjekte eder |
| K6 | Allowlist `blockedPrefixes` varsayılanı **boş** | Tüketici kendi domain listesini tanımlar |
| K7 | Event code'ları **injectable** + nötr varsayılan | Tüketici domain kodlarını enjekte eder |
| K8 | `FieldHarness` → **`HubHarness`** + JSDoc/README domain temizliği | Davranış değişmez |
| K9 | Telemetri push aralığı pakette **YOK** | Tüketici açılışta okur (env opsiyonel); canlı değişim YOK |
| K10 | **Wire JSON şekilleri değişmez** | v1/v2 tagli deployment'lar çalışmaya devam eder |
| K11 | Tüketici modülü `tunnel-extensions` **web-service içinde** | Tek tüketici; ayrı paket YOK (YAGNI) |
| K12 | Bağımsız import için **d.ts + exports** bu turda | `tsc --emitDeclarationOnly` + `exports` haritası (isim İP-4'te) |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Telemetri tipleri/mesajları/şeması pakette | `packages/ws-tunnel/src/protocol/messages.ts#TelemetryMessage`; `#telemetryQuerySchema`; `packages/ws-tunnel/src/types.ts#TunnelTelemetryPoint` |
| B2 | Snapshot push kaynağı + telemetri push timer'ı + aralık pakette | `packages/ws-tunnel/src/snapshot/interface.ts#ISnapshotSource`; `packages/ws-tunnel/src/connector/tunnel-connector.ts#TunnelConnector`; `messages.ts#TunnelOperationalConfig` |
| B3 | Operation + olay mesajları pakette | `messages.ts#OperationExecuteMessage`; `#EventMessage` |
| B4 | `@gd-monorepo/result` bağımlılığı pakette | `packages/ws-tunnel/package.json`; `packages/ws-tunnel/src/proxy/session-gateway.ts#SessionGateway` |
| B5 | Sert upstream kuralı pakette | `packages/ws-tunnel/src/client/tunnel-client.ts#upstreamUrl` |
| B6 | Domain varsayılan sabitleri (`container_session`, auth allowlist) | `packages/ws-tunnel/src/proxy/tunnel-proxy.ts#DEFAULT_COOKIE_NAME`; `#DEFAULT_PATH_ALLOWLIST` |
| B7 | Domainli log event code'ları pakette | `tunnel-connector.ts#TunnelConnector` (field_connected/field_config_rejected/…) |
| B8 | `fieldId` alanları pakette | `packages/ws-tunnel/src/proxy/session-gateway.ts#SessionOpenInput`; `packages/ws-tunnel/src/audit/interface.ts#IAuditSink` |
| B9 | `FieldHarness` + domainli JSDoc'lar | `packages/ws-tunnel/src/demo/field-harness.ts#FieldHarness` |
| B10 | Bağımsız import engeli: d.ts yok, `private:true`, `main:src` | `packages/ws-tunnel/package.json` |

## 4. Mimari

### 4.1 Paket (saf transport) vs tüketici (domain)

```
┌──────────────────────────── packages/ws-tunnel (BAĞIMSIZ) ────────────────────────────┐
│ codec · protocol: register/ack · config-update(heartbeat) · heartbeat ·                │
│ open-session/ack/end · stream-open/ack/window/close · error                            │
│ connector(TunnelConnector) · client(TunnelClient) · hub(SessionGateway/HubSessionStore/ │
│ TunnelProxy/HubPeerRegistry) · channel · result(yerel) · logger/token/audit/snapshot?   │
│ Bağımlılık: ws + zod                                                                     │
└──────────────────────────────────────────────────────────────────────────────────────┘
        ▲ jenerik kontrol/binary kanal (bilinmeyen tipler subscriber'a akar)
        │
┌──────────────────────────── tüketici: tunnel-extensions (web-service) ────────────────┐
│ telemetri tipleri + şemaları · operation tipleri + şeması · EventMessage ·              │
│ snapshot push timer'ı (TELEMETRY_INTERVAL env) · TelemetryQueryResponder ·             │
│ OperationRequester/Responder · FieldEventCollector · ContainerProxy/Snapshot adaptörleri│
│ GD-PMS event code'ları · container_session / allowlist blocked / routeUpstream         │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Arındırma ilkesi

Domain'e ait her şey (telemetri, operasyon, olay, domain sabit/kod/isim) **tüketiciye** taşınır; paket yalnızca jenerik transport + oturum + stream taşır. Jenerik kontrol kanalı (bilinmeyen tip → subscriber) taşıma yolu olduğu için **wire değişmez** (K10).

## 5. Purity Kuralları

1. Paket yalnız transport + oturum + stream: `register/ack`, `config-update` (yalnız heartbeat), `heartbeat`, `open-session/ack/end`, `stream-*`, `error`.
2. Telemetri/operation/event ve bunların tipleri/şemaları pakette **YOKTUR** (tüketici `tunnel-extensions`).
3. Paket bağımlılığı yalnız `ws` + `zod` (+ `jose` devDep test yardımcısı); `@gd-monorepo/*` bağımlılığı YASAK.
4. Wire JSON şekilleri değişmez; arındırma yalnız *tip/yer* taşımadır.
5. Domain sözcükleri (container/field/boss/bess/revpi) ve domain sabitleri core'da geçmez; anlam tüketici enjeksiyonunda.
6. İP-1 opaklık ilkeleri korunur (opak servis duyurusu, keşif≠erişim, push-based, peer↔peer yok).

## 6. Use Case'ler

### 6.1 UC-1 — Telemetri/operation/event'i paketten çıkar, tüketiciye taşı

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: paket yüzeyinden çıkarma, connector telemetri timer/snapshot temizliği, `tunnel-extensions` modülü, tüketici import güncellemeleri.
- hariç: paketleme (UC-4), isim/config arındırma (UC-3), Result (UC-2).

**Akış:**
1. Paketteki telemetri/operation/event tipleri+şemaları tüketici modülüne taşınır.
2. `TunnelConnector` telemetri push timer'ı ve snapshot enjeksiyonunu bırakır.
3. Tüketici, snapshot push timer'ını `connector.sendControl` ile kurar (iki tier).
4. Mevcut responder/requester/collector/adaptörler yeni modüle bağlanır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Paket public yüzeyinden `TunnelTelemetryPoint`, `TelemetryMessage`, telemetri-query/result/error, `OperationExecute/ResultMessage`, `operationExecuteSchema`, `EventMessage`, `ISnapshotSource` ÇIKARILMALI | AK-1.1 |
| FR-1.2 | `TunnelConnector` telemetri push timer'ı ve snapshot enjeksiyonunu TAŞIMAMALI | AK-1.2 |
| FR-1.3 | `TunnelOperationalConfig` yalnız `heartbeatIntervalMs` taşımalı (telemetri aralığı YOK) | AK-1.3 |
| FR-1.4 | Tüketici `tunnel-extensions` modülü tipleri+şemaları ve snapshot push timer'ını içermeli | AK-1.4 |
| FR-1.5 | Mevcut tüketiciler (responder/requester/collector/container-proxy/snapshot sources) yeni modüle bağlanmalı | AK-1.5 |
| FR-1.6 | Telemetri/operation/event wire JSON şekilleri DEĞİŞMEMELİ | AK-1.6 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** paket index'i **WHEN** telemetri/operation/event sembolleri aranır **THEN** export EDİLMEZ.
2. **AK-1.2 — GIVEN** `TunnelConnector` kurulur **WHEN** bağlantı kurulur **THEN** telemetri push timer'ı kurulmaz; gövdede snapshot injection yoktur.
3. **AK-1.3 — GIVEN** `TunnelOperationalConfig` **WHEN** alanlar incelenir **THEN** yalnız `heartbeatIntervalMs` (opsiyonel) bulunur.
4. **AK-1.4 — GIVEN** tüketici `tunnel-extensions` **WHEN** snapshot push kurulur **THEN** timer `connector.sendControl({type:"telemetry",…})` gönderir.
5. **AK-1.5 — GIVEN** mevcut tüketiciler **WHEN** derlenir/çalışır **THEN** tip importları yeni modülden çözülür, davranış aynıdır.
6. **AK-1.6 — GIVEN** eski/yeni peer **WHEN** telemetri alışverişi **THEN** frame JSON'u birebir aynıdır.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Tipler paketten çıktı | unit | ⬜ |
| AK-1.2 | Connector telemetrisiz | unit | ⬜ |
| AK-1.3 | Config yalnız heartbeat | unit | ⬜ |
| AK-1.4 | Tüketici push timer'ı | unit | ⬜ |
| AK-1.5 | Tüketici importları taşındı | build/test | ⬜ |
| AK-1.6 | Wire şekli sabit | integration | ⬜ |

**T Görev Listesi:**
- [ ] T-1: Paketten telemetri/operation/event tipleri+şemalarını çıkar (`messages.ts`, `types.ts`, `snapshot/`)
- [ ] T-2: `TunnelConnector` telemetri timer/snapshot temizliği + config yalnız heartbeat
- [ ] T-3: YENİ `tunnel-extensions` tipleri+şemaları (paketten birebir taşıma)
- [ ] T-4: Snapshot push timer'ı + iki tier wiring (`container.ts`)
- [ ] T-5: Tüketici import güncellemeleri (responder/requester/collector/container-proxy/snapshot sources)
- [ ] T-6: Test güncellemeleri (messages/connector/loopback/spec'ler/wire uyum)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Eski peer bilinmeyen mesaj gönderir | Jenerik observer'a akar (mevcut yol) |
| Hub eski `telemetryIntervalMs` push eder | Paket config'i bilinmeyen alanı strip eder |
| Snapshot kaynağı hata verir | Push atlanır; bağlantı etkilenmez (mevcut davranış) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ws-tunnel/src/protocol/messages.ts` | Telemetri/operation/event tipleri+şemaları çıkar |
| `packages/ws-tunnel/src/types.ts` | `TunnelTelemetryPoint` çıkar |
| `packages/ws-tunnel/src/snapshot/` | Modül çıkar |
| `packages/ws-tunnel/src/connector/tunnel-connector.ts` | Telemetri timer/snapshot çıkar |
| `services/web-service/src/infrastructure/tunnel-extensions/` | YENİ — domain tipleri + push |
| `services/web-service/src/config/container.ts` | Extension wiring |

### 6.2 UC-2 — `Result` yerel gömme + bağımlılık sınırı

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: yerel `Result`+hata sınıfları, import göçü, dependency çıkarımı.
- hariç: hata taksonomisi semantics değişikliği (birebir API).

**Akış:**
1. `src/result/` altına `Result<T,E>` + `DomainError` + ValidationError/Conflict/Forbidden/Transient/Fatal.
2. 5 kullanan dosya yerel importa geçer (`FrameDecodeError` yerel `ValidationError`'dan türer).
3. `package.json`'dan `@gd-monorepo/result` çıkar.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Paket, `@gd-monorepo/result` ile birebir API'li yerel `Result`+hata taksonomisi içermeli | AK-2.1 |
| FR-2.2 | `@gd-monorepo/result` bağımlılığı paketten çıkarılmalı (dependencies = `ws`+`zod`) | AK-2.2 |
| FR-2.3 | `decode` throw etmez garantisi ve hata `kind` değerleri korunmalı | AK-2.3 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** yerel `Result` **WHEN** `ok/err/isOk/isErr/unwrap/error` çağrılır **THEN** eski API ile aynı davranır.
2. **AK-2.2 — GIVEN** `packages/ws-tunnel/package.json` **WHEN** dependencies okunur **THEN** yalnız `ws`+`zod` vardır.
3. **AK-2.3 — GIVEN** bozuk frame **WHEN** `decode` çağrılır **THEN** throw etmez, `err(FrameDecodeError)` döner; tüketici `kind` eşlemesi bozulmaz.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Yerel Result API eşdeğeri | unit | ⬜ |
| AK-2.2 | Bağımlılık ws+zod | kod inceleme | ⬜ |
| AK-2.3 | decode garantisi + kind | unit/integration | ⬜ |

**T Görev Listesi:**
- [ ] T-7: `src/result/` yerel `Result` + hata sınıfları
- [ ] T-8: 5 dosya import göçü (`frame-codec`, `session-gateway`, `reconnect-delay`, `tunnel-connector`, `hub/registry`)
- [ ] T-9: `package.json` dependency çıkarımı + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Tüketici kendi `@gd-monorepo/result`'ünü kullanır | Yapısal uyum (isErr/error); tip kimliği ayrı, davranış aynı |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ws-tunnel/src/result/` | YENİ — yerel Result + hatalar |
| `packages/ws-tunnel/src/codec/frame-codec.ts` | Yerel import |
| `packages/ws-tunnel/src/proxy/session-gateway.ts` | Yerel import |
| `packages/ws-tunnel/package.json` | Dependency çıkar |

### 6.3 UC-3 — İsim ve varsayılan arındırma

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: upstream router, cookie/allowlist varsayılanları, event code'ları, `hubId`, `HubHarness`, JSDoc/README.
- hariç: wire değerleri (peerType enum, telemetry şekli — K10); v3.

**Akış:**
1. Upstream kuralı injectable; varsayılan mevcut.
2. Cookie/allowlist/event code varsayılanları nötr; tüketici enjekte eder.
3. `fieldId` → `hubId`; `FieldHarness` → `HubHarness`; JSDoc domain kelimeleri temizlenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | `TunnelClientConfig.routeUpstream?` injectable; varsayılan mevcut `api/static` kuralı | AK-3.1 |
| FR-3.2 | Cookie varsayılanı nötr (`tunnel_session`); tüketici cookie adını enjekte eder | AK-3.2 |
| FR-3.3 | Allowlist `blockedPrefixes` varsayılanı boş; tüketici kendi listesini tanımlar | AK-3.3 |
| FR-3.4 | `TunnelConnectorConfig.eventCodes?` injectable; nötr varsayılan; tüketici domain kodlarını enjekte eder | AK-3.4 |
| FR-3.5 | `fieldId` → `hubId` (paket + tüketici çağrı siteleri) | AK-3.5 |
| FR-3.6 | `FieldHarness` → `HubHarness`; JSDoc/README domain kelimeleri temizlenir | AK-3.6 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** özel `routeUpstream` **WHEN** stream yönlendirilir **THEN** özel kural uygulanır; verilmezse mevcut kural.
2. **AK-3.2 — GIVEN** cookie adı verilmez **WHEN** oturum cookie'si üretilir **THEN** `tunnel_session`; tüketici `container_session` enjekte eder.
3. **AK-3.3 — GIVEN** allowlist verilmez **WHEN** yol izinlenir **THEN** varsayılan blocked boştur; tüketici kendi listesini enjekte eder.
4. **AK-3.4 — GIVEN** connector kurulur **WHEN** bağlantı olayı loglanır **THEN** nötr kod (`tunnel_connected`); tüketici GD-PMS kodlarını enjekte eder.
5. **AK-3.5 — GIVEN** `SessionOpenInput` **WHEN** alanlar incelenir **THEN** `hubId` bulunur (`fieldId` YOK).
6. **AK-3.6 — GIVEN** demo ucu **WHEN** incelenir **THEN** `HubHarness`; core JSDoc'ta domain kelimesi YOK.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Upstream injectable | unit | ⬜ |
| AK-3.2 | Cookie nötr + injection | unit | ⬜ |
| AK-3.3 | Allowlist nötr + injection | unit | ⬜ |
| AK-3.4 | Event code injectable | unit | ⬜ |
| AK-3.5 | hubId rename | kod inceleme | ⬜ |
| AK-3.6 | HubHarness + JSDoc temiz | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-10: `routeUpstream` injection + varsayılan + test
- [ ] T-11: Cookie/allowlist nötr varsayılan + tüketici enjeksiyonu + test
- [ ] T-12: `eventCodes` injectable + nötr varsayılan + tüketici GD-PMS enjeksiyonu
- [ ] T-13: `fieldId` → `hubId` (paket + tüketici)
- [ ] T-14: `FieldHarness` → `HubHarness` + JSDoc/README temizliği

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Tüketici enjeksiyon yapmaz | Nötr varsayılan; mevcut deployment'lar kendi değerlerini enjekte eder |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ws-tunnel/src/client/tunnel-client.ts` | `routeUpstream` |
| `packages/ws-tunnel/src/proxy/tunnel-proxy.ts` | Cookie/allowlist varsayılanları |
| `packages/ws-tunnel/src/connector/tunnel-connector.ts` | `eventCodes` |
| `packages/ws-tunnel/src/proxy/session-gateway.ts`, `audit/interface.ts` | `hubId` |
| `packages/ws-tunnel/src/demo/field-harness.ts` | `HubHarness` |
| `services/web-service/src/config/container.ts`, `config/default.ts` | Tüketici enjeksiyonları |

### 6.4 UC-4 — Bağımsız paket arayüzü (d.ts + exports)

**Status:** 🟢 Doğrulanmış (2026-10-16)

**Kapsam:**
- dahil: d.ts üretimi, `exports` haritası, taze proje import yürüyüşü.
- hariç: isim marka, LICENSE, registry (İP-4).

**Akış:**
1. `tsc --emitDeclarationOnly` ile `dist/*.d.ts` üretilir.
2. `package.json` `main`/`types`/`exports` dist'e işaret eder.
3. Taze bir projede paket import edilip kullanılır (yürüyüş kontrolü).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Paket, `dist/` altında JS + d.ts üretmeli; `exports` haritası doğru işaret etmeli | AK-4.1 |
| FR-4.2 | Taze bir projede paket import edilip derlenebilmeli (monorepo'ya atıf olmadan) | AK-4.2 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** `build` **WHEN** çalıştırılır **THEN** `dist/index.js` + `dist/index.d.ts` üretilir, `exports` bunları çözer.
2. **AK-4.2 — GIVEN** taze proje **WHEN** `import { TunnelConnector }` yapılır **THEN** tip + kod çözülür, monorepo bağımlılığı istenmez.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | d.ts + exports | build | ⬜ |
| AK-4.2 | Taze proje import yürüyüşü | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-15: `build` hedefine `tsc --emitDeclarationOnly` + `exports` haritası
- [ ] T-16: Taze proje import yürüyüşü (README/demo)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| İsim/marka değişir | İP-4'te; bu turda isim korunur |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ws-tunnel/package.json` | `build` + `exports`/`types` |
| `packages/ws-tunnel/tsconfig.json` | declaration emit |
| `packages/ws-tunnel/README.md` | Bağımsız kullanım |

### 6.5 Paket Geneli Görevler

- [ ] T-17: `AGENTS-WS-TUNNEL.md` sözleşmesi (telemetri/operation/event pakette YOK; `hubId`; event code injection) + İP-1 SPEC bağımlılık satırı güncellemesi
- [ ] T-18: Demo'ların güncellenmesi (`peer-service-demo.mjs`, `loopback-demo.mjs` — `HubHarness`, telemetrisiz)

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Register | Wire şekli değişmez (services/peerType aynı) |
| Telemetri push | Tüketici timer'ı; aralık açılışta (env); canlı değişim YOK |
| Operation/event | Tüketici subscriber'ları; paket bilmez |
| Bilinmeyen mesaj | Jenerik observer'a akar (mevcut yol) |
| Hata kategorileri | Yerel `Result`/`DomainError` (`kind`: forbidden/transient/conflict/fatal/validation/not_found) |
| decode | Asla throw etmez (yerel Result ile korunur) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Paket bağımsız import edilebilir; core'da domain kelimesi/telemetri/operation/event YOK; bağımlılık `ws`+`zod` | grep + `package.json` + taze proje yürüyüşü |
| SC-2 | v1/v2 tagli deployment'lar bozulmadan çalışır (wire + regresyon) | monorepo test seti + demolar yeşil |
| SC-3 | Mevcut mühendislik kapıları korunur | ws-tunnel test + `typecheck` + build + coverage ≥%90 |
| SC-4 | Tüketici `tunnel-extensions` telemetri/operation/event davranışını birebir korur | responder/requester/collector testleri yeşil |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (✏️ Specified — onay bekliyor) |
| 2. JSDoc | T-1/T-3/T-7/T-10 sözleşmeleri |
| 3. TEST | T-6, T-9, T-10/T-11/T-12 kırmızı testler |
| 4. IMPL | T-1..T-16 |
| 5. KAPANIŞ | `WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Paket ismi/marka + LICENSE + registry | İP-4 (KUTUPHANE §8 kararı sonrası) |
| A2 | Telemetri canlı aralık değişimi (config-update) geri getirme | İhtiyaç belirirse tüketici subscriber'ı (K9) |
| A3 | v3 protokol: `peerType` serbest string + `labels` | İP-3 sonrası ayrı karar |
| A4 | `heartbeatIntervalMs` canlı değişimi | Pakette KALIR (transport concern) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. **İP-2 — Bootstrap/kimlik:** `WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md`.
2. **A4 — Host-based erişim:** `WS-TUNNEL-SUBDOMAIN-YONLENDIRME-MIMARISI.md` (tetikte).
3. **İP-4 — Paketleme/marka/license:** KUTUPHANE-CIKARMA-PLANI §8.

## 12. T Görev Özeti

| Kod | Görev | UC | Dosya |
|:----|:------|:---|:------|
| T-1 | Telemetri/operation/event tiplerini+şemalarını paketten çıkar | UC-1 | `packages/ws-tunnel/src/protocol/messages.ts`, `types.ts`, `snapshot/` |
| T-2 | Connector telemetri timer/snapshot temizliği + config heartbeat | UC-1 | `packages/ws-tunnel/src/connector/tunnel-connector.ts` |
| T-3 | `tunnel-extensions` tipleri+şemaları | UC-1 | `services/web-service/src/infrastructure/tunnel-extensions/` |
| T-4 | Snapshot push timer'ı + iki tier wiring | UC-1 | `services/web-service/src/config/container.ts` |
| T-5 | Tüketici import güncellemeleri | UC-1 | `services/web-service/src/infrastructure/**` |
| T-6 | Test güncellemeleri + wire uyum testi | UC-1 | `packages/ws-tunnel/src/**/*.test.ts`, specs |
| T-7 | Yerel `Result` + hata sınıfları | UC-2 | `packages/ws-tunnel/src/result/` |
| T-8 | 5 dosya import göçü | UC-2 | `frame-codec.ts`, `session-gateway.ts`, `reconnect-delay.ts`, `tunnel-connector.ts`, `hub/registry.ts` |
| T-9 | Dependency çıkarımı + testler | UC-2 | `packages/ws-tunnel/package.json` |
| T-10 | `routeUpstream` injection | UC-3 | `packages/ws-tunnel/src/client/tunnel-client.ts` |
| T-11 | Cookie/allowlist nötr varsayılan + tüketici enjeksiyonu | UC-3 | `packages/ws-tunnel/src/proxy/tunnel-proxy.ts` |
| T-12 | `eventCodes` injectable + tüketici enjeksiyonu | UC-3 | `packages/ws-tunnel/src/connector/tunnel-connector.ts` |
| T-13 | `fieldId` → `hubId` | UC-3 | `packages/ws-tunnel/src/proxy/session-gateway.ts`, `audit/interface.ts` |
| T-14 | `FieldHarness` → `HubHarness` + JSDoc/README | UC-3 | `packages/ws-tunnel/src/demo/field-harness.ts` |
| T-15 | `build` + `exports`/`types` (d.ts) | UC-4 | `packages/ws-tunnel/package.json`, `tsconfig.json` |
| T-16 | Taze proje import yürüyüşü | UC-4 | `packages/ws-tunnel/README.md` |
| T-17 | AGENTS-WS-TUNNEL.md + İP-1 SPEC bağımlılık satırı | Genel | `AGENTS-WS-TUNNEL.md`, `WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md` |
| T-18 | Demo güncellemeleri | Genel | `tools/peer-service-demo.mjs`, `packages/ws-tunnel/examples/loopback-demo.mjs` |

**review_date:** 2026-10-16 — 🟢 doğrulanmış (KAPANIŞ: WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-KAPANIS.md).
