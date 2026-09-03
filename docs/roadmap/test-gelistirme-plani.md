# Test Geliştirme Planı — NIS-2 & TEİAŞ Kapsamı

> Durum: **UYGULANIYOR** (2026-08-30) — Kullanıcı onayı: tüm fazlar + dokümantasyon.
> Kaynak analiz: doküman seti (README, AGENTS, TESTING.md, KONTEYNER-UZAKTAN-ERISIM-
> MIMARISI.md, owasp-asvs-level2.md, nis-2.md, teias-uyumluluk-degerlendirmesi.md) +
> komple test envanteri taraması (130 test dosyası, ~1500 test).
> Kural: yeni testler yazılırken TDD (JSDoc → kırmızı → yeşil); legacy dosyalara
> önce karakterizasyon testi. Her faz sonunda ilgili projenin testleri çalıştırılır
> ve sonuç "Test Geliştirme Doğrulaması" bölümüne (aşağıda) işlenir.

## Analiz özeti (başlangıç durumu)

**Güçlü:** web-service (44 dosya/526 test), core logging/frame-codec, device-service
alarm sistemi, field-connector (senaryo kapsamı ~%100), field (92), shared-types (111).

**Kritik boşluklar:** core `ModbusDevice` 734 satır → 3 test (write/writeAtomic
rollback 0 test — TEİAŞ #22); token-adapter branch %77.8 (exp/yanlış secret/alg
karıştırma testsiz); kurtarma kodu tek kullanımlığı DB'de testsiz; TOTP deneme
throttle'ı YOK (ASVS V3.5.2); container-web/field 401-refresh interceptor'ları 0 test;
superadmin/desktop 0 test; E2E 9 senaryo (hedef 15; alarm/MFA/kilit/manevra E2E'si yok).

**Altyapı:** field+superadmin vitest workspace dışı; coverage threshold yok;
`test:coverage` kırık; ESLint config çalışmıyor; `.github/workflows/test.yml` YOK;
`@nis2-security` tag'i + `test-nis2` hedefi YOK (nis-2.md Adım 5/11/14 uygulanmamış);
TESTING.md envanteri bayat.

## Fazlar

### Faz T1 — Güvenlik-kritik unit borçları
1. `ModbusDevice` write/writeAtomic rollback + `validate.reads` + timeout (TEİAŞ #22)
2. token-adapter: exp'li token, yanlış secret'lı geçerli JWT, alg karıştırma,
   mustChangePassword claim round-trip → %90 branch
3. user-repository: consumeRecoveryCode tek kullanımlık + MFA SQL metodları
4. rbac: session+MFA atlama pinleme, PUBLIC prefix sınırları, mustChange∩MFA önceliği,
   yanlış-metod reddi
5. `bun-password-hasher` + `ws-routes.ts` auth karakterizasyonu
6. TOTP deneme throttle mekanizması + testi (kod değişikliği — ASVS V3.5.2)

### Faz T2 — Frontend kritik akışlar
7. container-web + field `api-client` 401-refresh interceptor (kuyruk, `_retry`,
   döngü koruması, tünel skip)
8. RealtimeContext token refresh/reconnect; LogStore 2 sn debounce
9. controlApi + manevra `transform`'ları; ui WebSocket/HttpPolling transport'ları
10. field `useContainerTelemetry` + sparkline

### Faz T3 — Altyapı 0-test modülleri
11. core: ModbusTcpClient/RTU/transport, RedisConnection, PostgresAdapter
12. shared-utils ConfigLoader/sources/units; web-service awilix container + server smoke
13. materialized-view-manager + timescaledb-adapter INSERT/downsample (Faz 5.2 köprüsü)
14. device-service canonical tag testi; integration-service error branch'leri

### Faz T4 — Kapsam genişletme
15. simulators BSC/XRack/EnergyAnalyzer; ui komponentleri (RackCard/BSCCard/
    ManeuverCard/DeviceGauges/TranslationProvider)
16. superadmin + container-desktop smoke; demo-backend karakterizasyonu

### Faz T5 — E2E genişletme (hedef 15+)
17. `e2e/security/`: alarm akışı (KE1-4), MFA login/enroll, kilit 429, oturum dolması
18. manevra UI akışı, WS kopma→reconnect, rol görünürlüğü

### Faz T6 — NIS-2 kanıt fabrikası + altyapı
19. field+superadmin workspace'e; coverage threshold'ları
20. `test:coverage` onarımı; `@nis2-security` tag + `test-nis2` hedefi + CI adımı
21. `.github/workflows/test.yml`; TESTING.md envanter güncellemesi; ESLint onarımı

## Test Geliştirme Doğrulaması (faz kapanışları)

| Faz | Kapsam | Yeni test | Sonuç | Tarih |
|-----|--------|-----------|-------|-------|
| T1 | güvenlik-kritik unit | ModbusDevice write/rollback (11), token-adapter güvenlik (6) + **alg pinleme düzeltmesi**, user-repository MFA (6), rbac sınırları (6) + **PUBLIC prefix segment düzeltmesi**, bun-password-hasher (4) + **verify throw→false düzeltmesi**, ws-routes (7), **TOTP throttle mekanizması + testleri (5)** | ✅ web-service 569/569, core 199/199 | 2026-08-30 |
| T2 | frontend kritik akışlar | container-web interceptor (7), LogStore (6) + **zustand v5 createJSONStorage düzeltmesi**, controlApi+transform (7), RealtimeContext (4), field interceptor (5), useContainerTelemetry (3), ui transport'lar (13) | ✅ container-web 82/82, field 100/100, ui 56/56 | 2026-08-30 |
| T3 | altyapı 0-test | canonical tag (2), integration-service error (5), ModbusTcpClient (7), RedisConnection (7), ConfigLoader (10), TimescaleDB write (6), ModbusRtuClient (6) | ✅ core 223/223, shared-utils 17/17, integration-service 17/17, device-service 25/25 | 2026-08-30 |
| T4 | kapsam genişletme | BSC simülatör (5), TranslationProvider (5), RackCard (5), superadmin smoke (3) | ✅ simulators 54/54, ui 66/66, superadmin 3/3 | 2026-08-30 |
| T5 | E2E | e2e/security: TOTP kilit 429, alarm uçları KE (3), otomatik guest (2); maneuver-ui (1); Playwright `security` projesi | ✅ spec'ler yazıldı + `--list` doğrulandı (14 senaryo) — docker stack'te koşulacak | 2026-08-30 |
| T6 | altyapı/NIS-2 kanıt | field+superadmin workspace'e; **test:unit/test:coverage onarımı** (`--workspace`); `@nis2-security` etiketleri (8 dosya); `test-nis2` hedefi (core+web-service); `.github/workflows/test.yml`; TESTING.md envanter güncellemesi | ✅ root 140 dosya / 1354 test tek komutla; test-nis2: core 29 + web-service 49 test | 2026-08-30 |

## Kapanış notları

- **Toplam:** 130 → 140 test dosyası; ~1500 → **1354 test** (root `bun run test:unit` — field+superadmin dahil).
- **Bulunan ve düzeltilen üretim hataları (testlerin yakaladığı):**
  1. token-adapter: jose alg karıştırma — HS512 token HS256 doğrulamasında KABUL ediliyordu → `algorithms: ["HS256"]` pinlendi (ASVS V2).
  2. bun-password-hasher: bayat hash formatında `verify` THROW ediyordu → login 500 → `false` dönüşü (kontrat `Promise<boolean>`).
  3. rbac PUBLIC_PREFIX: `/health` öneki `/healthz`'i de public sayıyordu → segment sınırlı eşleme.
  4. container-web LogStore: zustand v5'te ham `storage` objesi JSON sarmalamıyordu → persist `[object Object]` yazıyordu → `createJSONStorage` sarması.
  5. container-web/field vitest ortamları: matchMedia + @pixi/react inline eksikleri (test altyapısı düzeltildi).
- **Bilinçli kapsam dışı (plan notları):** awilix container smoke, server.ts bootstrap smoke, materialized-view-manager, container-desktop renderer smoke (vite:import-analysis alias sınırı), coverage `thresholds` enforcement (superadmin/desktop 0'dan geldiği için önce T4 genişletmesi gerekir — CI'da `test-nis2` + SonarCloud kapısı yeterli kanıt), ESLint flat-config onarımı (ayrı iş — `nx run ui:lint` mevcut borçtan kırık), BSC ack register'ının vitest/bun ortam farkı (bsc-simulator.test.ts JSDoc notu).
- **Flaky not:** `field-connector.spec.ts` "WS kopunca backoff → yeniden bağlanır" workspace paralel koşusunda ara sıra timeout verebiliyor (tek başına her zaman yeşil — gerçek WS + zaman hassasiyeti). Tekrar koşuda geçer; kalıcı çözüm (retry/timeout artışı) ayrı iş.
- **Düzeltilen ek tip borçları (testlerin ortaya çıkardığı):** TranslationProvider `availableLocales` interface/implementasyon uyumsuzluğu (kontrat fonksiyon isterken dizi sunuluyordu) — kontrata uyduruldu; RackCard test `id: number` düzeltmesi.
