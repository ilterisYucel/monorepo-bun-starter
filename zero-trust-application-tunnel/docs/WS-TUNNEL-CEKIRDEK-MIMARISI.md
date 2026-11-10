---
status: active
space: architecture
tags: [mimari, ws-tunnel, zero-trust, codec, spec]
review_date: 2026-11-10
---

# WS Tunnel — Çekirdek — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `WS-TUNNEL-HUB-MIMARISI.md`, `WS-TUNNEL-AGENT-MIMARISI.md`, `AGENTS-WS-TUNNEL.md`.

## 1. Amaç ve Bağlam

Zero-Trust Application Tunnel projesinin çekirdek kütüphanesi: binary frame codec, v2 wire protokolü, connector (peer→hub), client (peer tarafı stream multiplexer), kanal portları. Paket monorepo'dan bağımsız/ayrı ürün olarak kullanılabilir.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Codec, wire mesajları, connector durum makinesi, client akış/limit yönetimi, kanal portları |
| hariç | Hub oturum/proxy (WS-TUNNEL-HUB), agent kurulumu (WS-TUNNEL-AGENT), web-service tüketicisi |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | `decode` ASLA throw etmez (güvenilmez WS girdisi → `Result.err`); `encode` programcı hatasında throw eder — bilinçli hibrit | Fuzz-dayanıklı |
| K2 | 9 bayt başlık (streamId u32 BE + seq u32 BE + flags); `FIN 0x01`/`RST 0x02`/`WS_OP 0x04`; `MAX_CHUNK_SIZE` 64 KiB; `MAX_FRAME_PAYLOAD` 1 MiB; `streamId`/`seq` ayrı sayaç, `seq` yalnız teşhis | Donmuş sözleşme |
| K3 | Wire v2-ONLY: `peerId` + zorunlu `peerType`; v1 `containerId` fallback KALDIRILDI | Tek sürüm |
| K4 | `serviceAnnouncementSchema` STRICT: hedef adres/protokol/health/endpoint alanları REDDEDİLİR | Opaklık sınırı |
| K5 | `TunnelOperationalConfig` yalnız `heartbeatIntervalMs` taşır; telemetri aralığı pakette YOK | Domain sızıntısı yok |
| K6 | `TunnelRole` serbest string; rol eşleme/RBAC tüketicide | Kütüphane nötr |
| K7 | Connector durum makinesi: `offline→connecting→registered→connected↔backoff`; generation koruması (bayat soket olayları yok sayılır) | Yarış güvenli |
| K8 | Backoff `exp(2^n·1s)+jitter`, tavan 60 sn | Sarsıntı yok |
| K9 | Register v2 (`peerId`+`peerType`+`protocolVersion`); `register-ack.config`/`config-update` zod → restart'sız; geçersiz → `configRejected` + eski config korunur | Canlı config |
| K10 | Liveness: her heartbeat'te ping; `livenessTimeoutMs` pong yoksa kapat + backoff | Yarı-ölü bağlantı tespiti |
| K11 | Client: kredi bazlı backpressure (256 KiB), ≤64 KiB parça, 16 eşzamanlı akış tavanı → 503, idle/max-age sweep, **FIN sonrası akış kapatılır** (22× max-streams regresyonu), gzip başlıkları ack'ten strip (canlı `ERR_CONTENT_DECODING_FAILED`) | Deadlock/sızıntı yok |
| K12 | Kanal portları: `ISocketClient`/`ISocketClientFactory`/`ITunnelChannel`/`IHubChannel`; `onRejected(statusCode)` pre-upgrade 401 için | Taşıma bağımsız |
| K13 | Bağımsızlık: yalnız `ws` + `zod` + yerel Result; `@gd-monorepo/*` importu YASAK | Ayrı ürün |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Yerel `Result`/`DomainError` kopyası taşınır (bağımsızlık kararı, DOMAIN-KALINTI K2) | `zero-trust-application-tunnel/ws-tunnel/src/result/` |
| B2 | Hub/agent paketlerinde `project.json` yok — vitest workspace ile çalışır | `zero-trust-application-tunnel/*/package.json` |

## 4. Mimari

```text
Agent ──► TunnelConnector ──► ITunnelChannel (WsSocketClient) ──► hub /ws/peer
               │
               └──► TunnelClient (HTTP/WS multiplexer) ──► local target

Frame: [9B header][payload] ──► FrameCodec (decode → Result)
Wire:  register / register-ack / config-update / heartbeat / error / session-stream
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `zero-trust-application-tunnel/ws-tunnel/src/codec/frame-codec.ts#FrameCodec` | Codec |
| `zero-trust-application-tunnel/ws-tunnel/src/codec/types.ts#TunnelFrame` | Frame tipi |
| `zero-trust-application-tunnel/ws-tunnel/src/protocol/messages.ts#TUNNEL_PROTOCOL_VERSION` | Wire sürümü |
| `zero-trust-application-tunnel/ws-tunnel/src/connector/tunnel-connector.ts#TunnelConnector` | Connector |
| `zero-trust-application-tunnel/ws-tunnel/src/client/tunnel-client.ts#TunnelClient` | Client |
| `zero-trust-application-tunnel/ws-tunnel/src/channel/interface.ts#ITunnelChannel` | Kanal portu |

## 5. Purity Kuralları (ZORUNLU)

1. Paket domain kavramı taşımaz (K5/K6).
2. `decode` asla throw etmez (K1).
3. Opaklık: duyuru hedef alanı reddedilir (K4).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — Frame Codec

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: encode/decode, limitler, flag/opcode birleşimi, fuzz dayanıklılığı
- hariç: wire mesajları (UC-2)

**Akış:**
1. Encode: header + payload.
2. Decode: doğrula; hata → `Result.err`.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | `decode` hiçbir girdide throw etmez | AK-1.1 |
| FR-1.2 | Kısa/uzun frame reddedilir | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** 1000 rastgele bayt **WHEN** decode **THEN** throw yok
2. **AK-1.2 — GIVEN** 8 baytlık başlık **WHEN** decode **THEN** `Result.err`

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Fuzz | unit (`frame-codec.test.ts`) | ⬜ |
| AK-1.2 | Limit | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bilinmeyen opcode | İleri uyumluluk için korunur |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel/src/codec/**` | Codec |

### 6.2 UC-2 — Wire Protokolü

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: v2 mesajları, opak duyuru, operational config
- hariç: oturum/proxy (HUB)

**Akış:**
1. Peer register mesajı gönderir.
2. Hub ack/config döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Duyuru hedef alanı reddedilir (opaklık) | AK-2.1 |
| FR-2.2 | v2 mesajları peerId + peerType zorunlu kılar | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** hedef adres içeren duyuru **WHEN** doğrulanır **THEN** reddedilir
2. **AK-2.2 — GIVEN** peerType'siz register **WHEN** doğrulanır **THEN** reddedilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Opaklık | unit (`messages.test.ts`) | ⬜ |
| AK-2.2 | Zorunlu alan | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bilinmeyen mesaj | Aboneye akar |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel/src/protocol/**` | Wire |

### 6.3 UC-3 — Connector Yaşam Döngüsü

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: durum makinesi, generation koruması, backoff, liveness, canlı config
- hariç: agent wiring (AGENT)

**Akış:**
1. Connect → register → connected.
2. Hata → backoff → yeniden dene.
3. Config update restart'sız uygulanır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Bayat soket olayları yok sayılır (generation) | AK-3.1 |
| FR-3.2 | Geçersiz config eski config'i korur | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** eski soket olayı **WHEN** yeni bağlantı aktif **THEN** olay yok sayılır
2. **AK-3.2 — GIVEN** bozuk config-update **WHEN** uygulanır **THEN** `configRejected`, eski config kalır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Generation | unit (`tunnel-connector.test.ts`) | ⬜ |
| AK-3.2 | Config | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| 401 | `onRejected` → backoff |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel/src/connector/**` | Connector |

### 6.4 UC-4 — Client Akış Yönetimi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: kredi/backpressure, limitler, WS köprüsü, FIN kapatma, gzip strip
- hariç: hub proxy (HUB)

**Akış:**
1. HTTP/WS isteği stream'e dönüşür.
2. Kredi tükendiğinde gövde durur.
3. FIN'de akış kapatılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | 16 eşzamanlı akış tavanı uygulanır | AK-4.1 |
| FR-4.2 | FIN sonrası akış kapatılır (sızıntı yok) | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** 17. akış **WHEN** açılır **THEN** 503 döner
2. **AK-4.2 — GIVEN** FIN gönderildi **WHEN** durum incelenir **THEN** akış kapalı

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Limit | unit (`tunnel-client.test.ts`) | ⬜ |
| AK-4.2 | Sızıntı | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Backpressure | Kredi gelene kadar bekle |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel/src/client/**` | Client |

### 6.5 UC-5 — Kanal Portları

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: port tanımları, WS adapter, 401 yolu
- hariç: hub tarafı kullanım (HUB)

**Akış:**
1. Connector `ITunnelChannel` üzerinden konuşur.
2. Hub `IHubChannel` kullanır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Kanal portları taşıyıcıdan bağımsızdır | AK-5.1 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** farklı taşıyıcı **WHEN** port uygulanır **THEN** connector değişmez

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Port soyutlaması | unit (`ws-socket-client.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-5: UC-5 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Pre-upgrade 401 | `onRejected` |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `zero-trust-application-tunnel/ws-tunnel/src/channel/**` | Portlar |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Decode hatası | `Result.err` |
| Bağlantı kopması | Backoff |
| Config hatası | Eski config |
| Akış tavanı | 503 |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Codec fuzz temiz | komut |
| SC-2 | Connector/client testli (198 test) | komut |
| SC-3 | Bağımsızlık (monorepo importu yok) | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 14 test dosyası / 237 test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-5 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `WS-TUNNEL-CEKIRDEK-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Yerel Result kopyasının ayrı ürün sınırı kararı (B1) | Kabul edildi |
| A2 | Hub/agent için Nx proje tanımı (B2) | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Nx proje tanımları (A2).
2. Üçüncü taraf peer implementasyonu için interop testleri.

## 12. T Görev Özeti

| T-1 | UC-1 (codec) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (wire) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (connector) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (client) kanıt testlerinin eşleştirilmesi |
| T-5 | UC-5 (kanal portları) kanıt testinin eşleştirilmesi |
