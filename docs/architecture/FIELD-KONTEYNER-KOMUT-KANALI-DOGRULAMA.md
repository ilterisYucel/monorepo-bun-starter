---
status: active
space: architecture
tags: [dogrulama, ws-tunnel, komut-kanali, field, konteyner, ppc, kural, ws3, ws4, ws5]
review_date: 2026-09-16
---

# Field↔Konteyner Komut Kanalı — DOGRULAMA

> **İş akışı aşaması:** 5/6 — SONUÇ.
> **Kaynak SPEC'ler:** [FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md](./FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md) §5 (PPC sinyal kaynağı), [KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md](./KONTEYNER-MANEVRA-KATALOGU-REV03-MIMARISI.md) §3-§4 (kural seti + eksikler), WS4 planı.
> **Kapsam:** WS3 (PPC synthetic telemetry), WS4 (D1-D5 komut kanalı), WS5 (unblocked kurallar).

## 1. Değişiklik Matrisi

| # | Değişiklik | Satır referansı | Neden |
|:--|:-----------|:----------------|:------|
| W1 | `ContainerConnectionTelemetryPublisher` (yeni) — ContainerObserver → synthetic MANAGEMENT job | `services/web-service/src/infrastructure/container-proxy/container-connection-telemetry-publisher.ts` | WS3 — FIELD doc §5 seçenek-a; R-07/FL-07 sinyal kaynağı |
| W2 | Field tier ContainerProxy'ye observer kaydı | `services/web-service/src/config/container.ts:210` | wiring (awilix) |
| W3 | `CommandDeviceJob.traceId` (opsiyonel alan) | `packages/shared-types/src/job.ts` | D1 — çapraz katman iz |
| W4 | Tünel ileri iletim başlıklarına `x-gd-trace-id` | `services/web-service/src/presentation/routes/session-routes.ts` (FORWARD_HEADERS) | D1 |
| W5 | Komut rotaları header'dan traceId'yi job'a taşır | `command-routes.ts:115,172,211` | D1 |
| W6 | device-service komut audit'inde `traceId` bağlamı | `services/device-service/src/device-service.ts:602` | D1 — konteyner log ↔ field log eşlemesi |
| W7 | Field tier oturum limiti 2 (1 UI + 1 programatik) | `services/web-service/src/config/container.ts:319` | D2 |
| W8 | `CollectingStreamSink` (yeni) — tünel yanıt toplayıcı | `services/web-service/src/infrastructure/container-session/collecting-stream-sink.ts` | D3 |
| W9 | `fieldContainerCommandRoutes` (yeni) — ince komut proxy'si | `services/web-service/src/presentation/routes/field-container-commands.ts` | D3 — iş mantığı SIFIR; konteyner siyah kutu |
| W10 | Route kaydı (field tier) | `services/web-service/src/presentation/server.ts:305` | D3 |
| W11 | `IContainerCommandChannel` + `HttpContainerCommandChannel` (yeni) | `services/management-service/src/container-command-channel.ts` | D4 |
| W12 | `container-command` kural aksiyonu (tip + şema) | `packages/shared-types/src/automation-rule.ts` | D4 |
| W13 | `ActionExecutor.runContainerCommand` | `services/management-service/src/action-executor.ts` | D4 — kademeli bozulma (kanal yoksa fail, akış durmaz) |
| W14 | management-service run.ts kanal wiring (env-gated) | `services/management-service/run.ts` | D4 |
| W15 | Field frontend `containersApi.executeCommands` | `apps/field/src/features/containers/services/containersApi.ts` | D5 |
| W16 | Konteyner tier `rules.json` (yeni) — `tms_temp_diff_protect` | `services/management-service/deployment/config/rules.json` | WS5 — 30264/30265 global register'larla birebir |
| W17 | Compose/env: field tier `FIELD_WEB_SERVICE_URL` + `FIELD_INTERNAL_API_TOKEN` | `deployment/docker-compose.field.yml` + `.dev.yml` + `.env.field.example` | D4 wiring |

## 2. Test Kanıtları

```
nx run web-service:test        → 56 dosya / 501 test YEŞİL
  +container-connection-telemetry-publisher.test.ts (4)
  +field-container-commands.test.ts (13)
nx run management-service:test → 9 dosya / 81 test YEŞİL
  +container-command-channel.test.ts (5)
  +action-executor.test.ts container-command blokları (3)
  +container-rules.test.ts (5)
nx run shared-types:test       → 88 test YEŞİL (+container-command şema testi)
nx run field:test              → 152 test YEŞİL (+containersApi.executeCommands 2)
```

## 3. Kabul Kriteri Kanıtları

| Kod | Kriter | Kanıt |
|:----|:-------|:------|
| K-D1 | Tünel komut isteği trace'i konteyner komut audit'ine taşır | W3-W6 + `field-container-commands.test.ts` "trace + cookie başlıkları" + "audit traceId bağlamda" |
| K-D2 | Programatik oturum operatör UI oturumunu düşürmez | W7 (`maxSessionsPerPeer: 2` — SessionGateway replace davranışı yalnızca 3. oturumda) |
| K-D3 | Komut yanıtı (per-step success/reason) field'a senkron döner | `field-container-commands.test.ts` "upstream yanıtı AYNEN döner (200/422)" — execute-multi kontratı tünel üzerinden uçtan uca |
| K-D4 | Kanal kopuk/eksikse kademeli bozulma, akış durmaz | `action-executor.test.ts` "kanal YOK → fail" + `container-command-channel.test.ts` "network hatası → ok=false" |
| K-D5 | Yetki: admin/teknik veya geçerli internal token; fail-closed | `field-container-commands.test.ts` 403 senaryoları (token yok/yanlış/guest) |
| K-D6 | WS5 kuralı doküman eşikleriyle birebir; blok seti tam; kenar-tetik | `container-rules.test.ts` (rack≥10 / pack≥5, tek ateşleme, K-A2 blok seti) |

## 4. Gözle Kontrol

- [x] `nx run web-service:build` yeşil (tip uyumu); route yalnızca field tier'da kaydediliyor (server.ts koşulu: sessionGateway + tunnelProxy + containerProxy).
- [x] Yetki akışı rbac hook ile tutarlı: Bearer → `request.user` (rbac.ts), internal token → timing-safe karşılaştırma (fail-closed).
- [x] Komut semantiği konteynerde kalıyor — field tarafında config çözümleme/komut doğrulama YOK (katman sızması yok).
- [x] Field frontend manevra paneli hâlâ mock (PCS adımları field device-service'e bağlı — FIELD doc T-M4 ayrı iş); konteyner adımları için `containersApi.executeCommands` hazır.
- [x] Tünel allowlist'i değişmedi: `/api/commands/execute-multi` zaten `/api/*` altında serbest; auth yolları yasaklı kaldı.

## 5. Sapmalar

| Sapma | Açıklama |
|:------|:---------|
| S-D1 | Blok kaldırma KURALI yazılmadı — OTOMASYON doc "reset beklenir" der (operatör/manual reset); `allow_charge/allow_discharge` komutları API'de hazır, release kuralı S10 mühendis onayı sonrası |
| S-D2 | FL-02/07/09/11/06 kuralları + TMS hysteresis seti "uygulama günü" kapsamında (OTOMASYON doc kararı — bütün halinde) |
| S-D3 | PPC değer eşlemesi idle→0/connected→1/stale→2/error→0 — FIELD doc §5 tasarımına birebir |

## 6. Genel Durum

WS3+WS4+WS5 tamamlandı: field uygulaması artık konteyner cihazlarına tünel üzerinden senkron doğrulanmış komut gönderebilir; başarı/hata iki katmanda trace bağlantılı audit'lenir; PPC durumu kural motoruna synthetic telemetri olarak akar; unblocked sıcaklık farkı koruması kurallarda canlı. Kapsam: `docs/roadmap/test-envanteri.md` §11. `review_date: 2026-09-16`.
