---
status: active
space: architecture
tags: [telemetri, panel, websocket, names-filtresi, rapor]
review_date: 2026-12-01
---

# Telemetri Panel WS — Değişiklik Raporu (inceleme / geri alma)

> Bu bir **rapor**tur (SPEC/KAPANIŞ değil). Amaç: yapılan değişikliği inceleyip
> gerekirse geri alabilmen. Kod referansları `#sembol` çapasıyladır.

## 1. Neden yapıldı (özet)

Panel tarzı bileşenler (TelemetryChart, SingleTelemetryChart, DeviceGauges, cihaz kartları)
tek bir WS soketinden **tüm** telemetri setini alıyordu: BSC için saniyede ~960 satır,
her satırda sabit metadata tekrarı. İstemci bunları panel başına filtreliyordu →
gereksiz parse/buffer/render + jank.

Çözüm (onaylı plan): **tek soket korunur** (tünelde tek stream); her panel **kendi
aboneliğini** bildirir (`deviceId` + `names`); **sunucu** yalnız istenen isimleri yollar;
`initial` snapshot istenen isimlerin **en yeni** değeriyle sınırlanır. Böylece panel-başına
ayrı soket gerekmez ve `ws-tunnel`'ın 16-stream limitine dokunulmaz.

## 2. Yapılan değişiklikler

| Katman | Dosya | Ne değişti |
|:-------|:------|:-----------|
| shared-types | `packages/shared-types/src/telemetry/transport.ts#ITelemetryTransport` | `addDevices?(deviceIds, names?)` — opsiyonel isim filtresi |
| client transport | `packages/ui/src/transports/WebSocketTransport.ts` | `nameFilters` map; `addDevices(ids, names?)`; `_subscribe` subscribe mesajına `names` ekler; reconnect'te names korunur; `removeDevices`/`disconnect` temizler |
| ui hook | `packages/ui/src/hooks/useTelemetryStream.ts` | `names?` seçeneği → `addDevices(ids, names)`; `namesKey` effect dep |
| app hook | `apps/container-web/src/features/telemetry/hooks/useDeviceTelemetry.ts` | `names` artık REST **ve** WS'e iletilir |
| backend | `services/web-service/src/infrastructure/realtime/realtime-manager.ts` | `socketNames` (socket→device→Set); `subscribe(deviceId, ws, names?)`; `broadcast` socket başına names süzer; `sendInitialData` istenen isimlerin en yenisini yollar |
| backend | `services/web-service/src/infrastructure/realtime/ws-routes.ts` | `subscribe` mesajındaki `names` parse edilir; names yoksa eski davranış |

**Geriye uyumluluk:** `names` verilmezse sunucu/istemci eski davranışta (tüm satırlar).
Mevcut bileşenler (global `RealtimeProvider`, `useRealtimeTelemetry`) etkilenmez.

## 3. Test kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Backend filtre/initial | `bunx vitest run src/infrastructure/realtime/realtime-manager.test.ts` (web-service) | 4/4 |
| Client transport names | `bunx vitest run src/transports/WebSocketTransport.test.ts` (ui) | 13/13 |
| Stream hook names | `bunx vitest run src/hooks/useTelemetryStream.test.ts` (ui) | 4/4 |
| Regresyon | `nx run-many --target=test --projects=web-service,ui,container-web,field` | 4 proje yeşil (web-service 577) |

## 4. Nasıl geri alınır

Tümü tek mantıksal değişiklik; dosya bazlı geri alma:
- `git checkout -- packages/shared-types/src/telemetry/transport.ts packages/ui/src/transports/WebSocketTransport.ts packages/ui/src/hooks/useTelemetryStream.ts apps/container-web/src/features/telemetry/hooks/useDeviceTelemetry.ts services/web-service/src/infrastructure/realtime/realtime-manager.ts services/web-service/src/infrastructure/realtime/ws-routes.ts`
- Test dosyalarını sil: `services/web-service/src/infrastructure/realtime/realtime-manager.test.ts` (yeni); `WebSocketTransport.test.ts` + `useTelemetryStream.test.ts` içindeki names blokları.
- (Bu rapor dosyasını da sil.)

## 5. Kalan iş (bu rapora dâhil edilmedi)

> Aşamalı uygulama planı: [docs/roadmap/grafana-style-telemetri-donusumu-plan.md](../roadmap/grafana-style-telemetri-donusumu-plan.md)

1. **Kompakt frame** `{d,n,v,t}` (metadata WS'ten çıkar; `telemetry-config`'ten gelir) — geriye uyum için opsiyonel `format` bayrağıyla.
2. **Spec-driven `useTelemetryProvider` + panel migrasyonu:** paneller `{deviceIds, names}` spec'iyle beslenir (TelemetryChart/SingleTelemetryChart/DeviceGauges/cihaz kartları), fetch panelde olmaz.
3. **Yalnız-değişen (diff-push):** sunucu son değeri tutup yalnız değişen satırları yollar (BSC saniyede birkaç satıra iner).
4. **Çok-kullanıcı kotası** (boss/container/field rol başına eşzamanlı oturum sınırı + red + security audit) — ayrı iş olarak kararlaştırıldı.
5. **Chart geçmişi:** global zaman aralığı + `/downsampled` (sonra karar).
