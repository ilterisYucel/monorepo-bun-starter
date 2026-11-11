---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, web-service, hexagonal]
review_date: 2026-11-10
---

# Web Service — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [WEB-SERVICE-MIMARISI.md](./WEB-SERVICE-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Tur 4 doğrulama kapanışı + yeni araç: `tools/arch-checks.mjs` (`bun run arch:check`). Bu turda diff yalnız lint-yorum/log-prefix düzeyinde; B1 drift'i AÇIK BUG olarak izleniyor.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/web-service/src/infrastructure/persistence/{command-write-store,log-repository,operation-def-store}.ts` | (değişiklik) `energy/require-parameterized-query` gerekçeli disable yorumları (identifier interpolasyonu yok; `$n` parametreli) — davranış YOK | lint turu |
| 2 | `services/web-service/src/presentation/routes/field-container-commands.ts` | (değişiklik) `energy/no-math-random` disable — trace-id üretimi (güvenlik değeri değil, gerekçe satırda) | K7 yüzeyi; davranış YOK |
| 3 | `services/web-service/src/tiers/site/infrastructure/hub-maneuver-channel.ts` | (değişiklik) `console.warn` → `[HubManeuverChannel]` prefix — AGENTS logging konvansiyonu | K2-lint; davranış yok |
| 4 | `application/use-cases/mfa-login-use-case.ts` + `mfa-enroll-use-case.ts` | (bulgu) `sha256Hex` DEĞER importu application → `infrastructure/auth/service-token` — hexagonal yön ihlali (arch:check) | K1/§4 — S2 |
| 5 | `presentation/routes/{unified,log}-routes.ts` | (bulgu) `DeviceRegistry`/`LogRepository`/`loadDeviceConfig` değer importları = B2 borcünün araçlaşmış hali | B2/A3 — S2 |
| 6 | `tiers/boss/infrastructure/field-event-collector.ts#COLLECTED_EVENT_CODES` | (BUG) 5 kod ↔ `UPLINK_EVENT_WHITELIST` 9 kod; yorum "birebir" der, DEĞİLDİR — `operation_*` boss'a HİÇ yazılmaz | B1/AK-4.2 — S1 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Dosya envanteri | glob `services/web-service` | **61 `.test.ts` + 2 `.spec.ts` = 63** — SPEC ile birebir |
| Katman purity | `bun run arch:check` (reviewer ilk koşusu) | **6 ihlal** (S2 dökümü) — composition roots muaf: `config/`, `index.ts`, `presentation/server.ts` |
| UC-1 | rbac.test **40 test** — segment sınırı, cookie/Bearer, MFA enforcement, rol matrisi | |
| UC-2 | hub-container-view + hub-ttl-cache + get-container-telemetry + get-field-containers | |
| UC-3 | command-routes (18), maneuver-routes (18), field-container-commands (10), command-channel (9) | |
| UC-4 | field-event-collector (dedupe), event-routes, field-event-reader, operation-requester | |
| UC-5 | realtime-manager (11, trim), ws-routes (7, token) | |
| UC-6 | hub-session-routes (2), hub-consumer-client (8), plugin | |
| UC-7 | health-route (2), topology-routes, log-routes (10), log-rate-limiter (4), error-handler (7), default.test (30 — K10 fail-fast) | |
| Taze koşu | `nx run web-service:test` | **İLETİLMEDİ** — reviewer salt-okuma (S7) |
| Mutasyon | `bun run test:mutation` | **İLETİLMEDİ** — diff'li dosyalar (stores/routes/channel) değişen kapsamda; güvenlik-kritik yüzey `--break 90` adayı (S7) |
| Otomatik envanter | `docs/roadmap/test-envanteri.otomatik.md` | **BAYAT** — taşınmamış eski yollar listeli (S6) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | PUBLIC önek segment sınırı (401) | `rbac.test.ts` "PUBLIC_PREFIX segment sınırı…" + 39 vaka | 🟡 |
| AK-2.1 | Konteyner görünümü cache + talep-üzeri | `hub-container-view.test.ts` + `hub-ttl-cache.test.ts` | 🟡 |
| AK-2.2 | Kısmi başarı (allSettled) | `hub-container-view.test.ts` erişim-hata vakası + `get-field-containers-use-case.test.ts` | 🟡 |
| AK-3.1 | Timeout `timeoutMs + 2000` | `command-routes.test.ts` — envanter | 🟡 |
| AK-3.2 | Field proxy internal-token fail-closed | `field-container-commands.test.ts` (10) | 🟡 |
| AK-4.1 | `(field_id,event_id)` dedupe | `field-event-collector.test.ts` | 🟡 |
| AK-4.2 | Whitelist TEK kaynak — `operation_*` boss'ta görünür | **SAĞLANMIYOR** — B1 drift canlı (9↔5); drift-testi YOK | ❌ |
| AK-5.1 | Ring buffer 299 + batch trim | `realtime-manager.test.ts` (11) | 🟡 |
| AK-5.2 | WS handshake token zorunlu | `ws-routes.test.ts` (7) | 🟡 |
| AK-6.1 | Hub erişimi yalnız `IHubTunnelPort` | collector/requester port kullanıyor; 2 route concrete tip tutuyor (B3 canlı); runtime'da adapter tek noktada kuruluyor (`config/container.ts` + `plugin.ts`) | 🟡 |
| AK-6.2 | Consumer token tarayıcıya sızmaz | `hub-session-routes.test.ts` (2) | 🟡 |
| AK-7.1 | `/health` logger degraded yansıtır | `health-route.test.ts` (2) | 🟡 |
| AK-7.2 | Bozuk topoloji 404 + kimlik | `topology-routes.test.ts` | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | **B1 whitelist drift — AÇIK BUG (AK-4.2 ❌)** | `UPLINK_EVENT_WHITELIST` (9) ↔ `COLLECTED_EVENT_CODES` (5); dört `operation_*` olayı boss'a asla ulaşmıyor; collector yorumu "birebir" diye YALAN söylüyor. SPEC İleri İş #1 "bug olarak izlenecek" diyordu — burada izleniyor. Çözüm yönü: tek ortak sabit (ör. `UPLINK_EVENT_WHITELIST` import edilip `COLLECTED_EVENT_CODES`'un yerine geçmesi) + drift testi (iki listenin eşitliğini assert eden tek `it()`). Karar developer |
| S2 | arch:check 6 ihlal | (a) 2× application→infrastructure değer importu (`sha256Hex`) — yeni; port/domain-util'a taşınmalı. (b) 3× presentation→infrastructure değer importu = B2/A3 bilinen borcün otomatik kanıtı. (c) 1× domain→`config/default` type import (`SeedUser`) — şekil sızıntısı, shared-types'a alınmalı. K1'in "framework" hükmü ihlal edilmiyor (fastify/pg yok) ama §4 diyagramının yön kuralı ihlal ediliyor |
| S3 | B3 canlı | `hub-session-routes.ts` + `field-container-commands.ts` somut `HubConsumerClient` tipi (yalnız type-import; runtime porttan) — A2 İleri İş'i geçerli |
| S4 | B4 canlı | `SYSTEM_USER` + `tokenMatches` iki dosyada kopya (`internal-authorize.ts`, `field-container-commands.ts`) — A1 İleri İş'i; fail-closed testi yalnız kopyalardan birini sabitliyor |
| S5 | Yol adı uyuşmazlığı | ✅ KAPANDI — tam rename ile kod `tiers/site/...` oldu; SPEC §6.2 yoluyla birebir |
| S6 | Otomatik envanter bayat | `test-envanteri.otomatik.md` taşınmadan önceki yolları listeli (`container-session/`, `field-uplink/`…) — `bun run test:inventory` yeniden koşulmalı (AGENTS kuralı: test değişince envanter tekrar) |
| S7 | Taze test + mutasyon iletilmedi | 63 dosya/494 test iddiası dosya sayısıyla doğrulandı, test toplamı taze koşuyla pinlenmedi |

### A.5 Gözle Kontrol Maddeleri

- [x] K2: `serviceTier` presentation'a sızmıyor (grep 0) — tier ayrımı `config/` + `tiers/*/registrations.ts`
- [x] K3: tek sınır hata noktası `error-handler` (7 test: ZodError 400, DomainError kind→HTTP, stack yok)
- [x] K5: latest limit/pencere/regex devri — TIMESERIES-KAPANIŞ AK-2.x ile çapraz doğrulandı
- [x] K9: 299 ring buffer + sweep sayıları `realtime-manager.test.ts` vakalarıyla eşleşiyor
- [x] K10: config fail-fast 30 testle (`default.test.ts`) — dev-secret/kısa-secret/seed/FIELD-ID-UUID dalları

### A.6 Genel Durum Özeti

**MODÜL KOŞULU UYGUN — bir açık bug ve araçlaşmış purity borcuyla:** 13 AK'dan 12'si testle karşı (🟡; taze koşu bekliyor), **AK-4.2 ❌ (S1 — operation_* boss'a hiç yazılmıyor; tek fonksiyonel veri-kaybu sapması)**. `arch:check` artık kapanışın kalıcı kanıt aracı: 6 ihlal → S2'de döküldü, temizlemeden SC-1 🟢 olamaz. **NIS-2:** rbac/throttle/token/config-fail-fast güvenlik kapıları testli (AUTH SPEC sahipliği, referans kopyasız); trace-id `Math.random` kullanımı gerekçeli istisna; B4 token-karşılaştırma kopyası tekillekleştirilmeli (timing-safe davranışının iki kopyada eşit kalması riski). Mutasyon: diff'li dosyalar için bekleniyor (güvenlik yüzeyi `--break 90` adayı).

### SPEC Revizyon Önerisi

- **B1/İleri İş #1 →** düzeltilene kadar `AK-4.2` kanıt hücresine "❌ bug açık" durumu işlendi; düzeltme tek ortak whitelist sabiti + eşitlik testi olarak tariflenebilir (davranış kararı developer).
- **§6.2 involved path →** `tiers/site/` (tam rename sonrası kodla birebir).

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| `/healthz-extra` | public öneke benzer yol | 401 (segment sınırı) | `rbac.test.ts` |
| Cookie + Bearer | ikisi birden | cookie öncelikli | rbac cookie vakaları |
| MFA zorunlu, kayıtsız admin | veri ucu | 403; allowlist yolları açık | rbac MFA bloğu |
| Konteyner erişilemez | görünüm | boş dizi + bayat cache `peek` fallback | `hub-container-view.test.ts` |
| 1/N konteyner hatası | allSettled | diğerleri döner | aynı + get-field-containers |
| timeoutMs 3000 | komut | 5000 ms sınırı | `command-routes.test.ts` |
| Internal token yok | field proxy | kapalı (fail-closed) | `field-container-commands.test.ts` |
| Aynı olay iki tur | collector | tek kayıt (dedupe) | `field-event-collector.test.ts` |
| `operation_started` | uplink | boss'ta GÖRÜNMÜYOR (S1 bug) | ❌ — drift testi yok |
| 960-isimli batch | ring buffer | kayıp yok, trim `max(299,len)` | `realtime-manager.test.ts` |
| Tokensiz WS | handshake | reddedilir | `ws-routes.test.ts` |
| Oturum açma | hub session | yalnız cookie set (token sızmaz) | `hub-session-routes.test.ts` |
| Logger degraded | `/health` | degraded | `health-route.test.ts` |
| Bozuk topoloji JSON | uç | 404 | `topology-routes.test.ts` |
| dev JWT secret / kısa secret / FIELD_ID bozuk | açılış | RED (fail-fast) | `default.test.ts` (30) |
| application→infra import | arch:check | ihlal listesi | `tools/arch-checks.mjs` — 6 açık |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | **B1 drift + drift testi yok (AK-4.2 ❌)** | **Yüksek** — boss operasyon görünürlüğü sessiz boş | Tek sabit + eşitlik assert'i (S1 çözümü) |
| G2 | Taze `nx run web-service:test` + test toplamı (494) pinlemesi | Düşük | Ana agent koşar |
| G3 | Mutasyon verisi yok (diff'li stores/routes/channel; güvenlik yüzeyleri) | Orta | `bun run test:mutation`; rbac/token dalları için `--break 90` |
| G4 | `sha256Hex` application sızıntısı testi/kapısı | Orta — auth throttle anahtar hesabı katman dışında | arch:check'i CI kapısı yapınca kalıcı kapanış |
| G5 | B4 kopya `tokenMatches` — iki kopyanın davranış eşitliği ayrı testte değil | Orta — tek taraflı düzeltme riski | A1 tekilleştirme ile kapanır |
| G6 | Envanter docs'u bayat (S6) | Düşük | `bun run test:inventory` |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 63 dosya eşleşti; arch:check eklendi (6 ihlal S2); AK-4.2 ❌ — B1 açık bug; SPEC §6.2 yol adı önerisi | (yok — öneri aşamasında) |
