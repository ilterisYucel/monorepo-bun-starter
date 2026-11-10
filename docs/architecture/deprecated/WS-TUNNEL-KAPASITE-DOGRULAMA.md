---
status: active
space: architecture
tags: [dogrulama, ws-tunnel, operasyon, faz-c, kontrol-mesaji]
review_date: 2026-09-22
---

# WS-TUNNEL Kapasite — Doğrulama Dokümanı (İP-5, KOMUT Faz C)

Bağlı tasarım: [WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md](./WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md)
Kapsam: **KOMUT-MANEVRA-OPERASYON Faz C (C1-C3)** — uzak kanal, boss↔field operasyon mesajları, sonuç yayılımı. C4 (admin UI sistem seçimi) İP-7 (Faz D2 frontend) ile yürüyecek — sapma S-5.

## 1. Genel Durum

| Görev | Durum | Kanıt |
|:------|:------|:------|
| C2a — `operation-execute`/`operation-result` tipleri + STRICT zod (K4: protokol değişikliği YOK) | ✅ | `messages.test.ts` 32/32 (4 yeni test) |
| C1 — `IRemoteCommandChannel` + executor uzak adım delegasyonu + rollback | ✅ | `operation-executor.test.ts` 20/20 (+3 Faz C testi) |
| C1 — `TunnelManeuverChannel` (field→konteyner tünel adaptörü) | ✅ | `tunnel-maneuver-channel.test.ts` 6/6 |
| C2b — `OperationResponder` (field) | ✅ | `operation-responder.test.ts` 5/5 |
| C2b — `OperationRequester` (boss) + boss tetikleme rotası | ✅ | `operation-requester.test.ts` 3/3 + `operation-boss-routes.test.ts` 5/5 |
| K1 — uçtan uca GERÇEK WS (boss hub + field connector + responder + yürütücü) | ✅ | `operation-flow.spec.ts` 2/2 (loopback WS) |
| C3 — Sonuç yayılımı (UplinkEventRelay whitelist) | ✅ | `uplink-event-relay.test.ts` güncelli |
| Wiring — awilix (registry/executor/store/channel/responder/requester) + index yaşam döngüsü + boss rota | ✅ | web-service 565/565 |
| Test seti (etkilenen 11 proje) | ✅ | tamamı yeşil (--skip-nx-cache) |

## 2. Değişiklik Matrisi

| Değişiklik | Dosya(lar) | Geçme |
|:-----------|:-----------|:------|
| Operasyon kontrol mesajları + `operationExecuteSchema` (STRICT; `type` zarf dahil) | `packages/ws-tunnel/src/protocol/messages.ts` | ✅ 32/32 |
| `IRemoteCommandChannel` sözleşmesi | `packages/platform/commands/src/operation-executor-contracts.ts` | ✅ |
| Executor: `remoteChannel` + uzak adım/rollback delegasyonu | `packages/platform/commands/src/operation-executor.ts` | ✅ 20/20 |
| Tünel manevra kanalı (field→konteyner POST /api/maneuvers/:name/execute) | `services/web-service/src/infrastructure/container-session/tunnel-maneuver-channel.ts` (YENİ) | ✅ 6/6 |
| OperationResponder (field: operation-execute → yürütücü → result) | `.../field-uplink/operation-responder.ts` (YENİ) | ✅ 5/5 |
| OperationRequester (boss: korelasyon + timeout) | `.../field-uplink/operation-requester.ts` (YENİ) | ✅ 3/3 |
| Boss tetikleme rotası | `presentation/routes/operation-boss-routes.ts` (YENİ) | ✅ 5/5 |
| K1 gerçek-WS integration | `.../field-uplink/operation-flow.spec.ts` (YENİ) | ✅ 2/2 |
| Uplink whitelist genişletme (operation_* terminal geçişleri) | `.../field-uplink/uplink-event-relay.ts` | ✅ |
| Event sözlüğü: maneuver_remote_failed, operation_boss_request, operation_result_sent | `packages/platform/logging/src/event-codes.ts` | ✅ |
| Awilix kayıtları + server/index wiring | `config/container.ts`, `presentation/server.ts`, `index.ts` | ✅ 565/565 |

## 3. Kabul Kriteri Kanıtları (WS-TUNNEL §9)

| Kod | Kriter | Sonuç |
|:----|:-------|:------|
| K1 | operation-execute → yürütme → operation-result uçtan uca (gerçek WS) | ✅ `operation-flow.spec.ts` — loopback WS: register-ack → connected → frame → responder → fake yürütücü → result aynı kanaldan |
| K2 | İki-hop audit zinciri (boss istek + field yürütme + konteyner cihaz) | ✅ `operation_boss_request`/`operation_result_sent` (field) + `operation_*` (yürütücü) + konteyner `command_*` (B3'ten gelen zincir — hop başına ayrı) |
| K3 | Bilinmeyen mesaj/kopuk peer kademeli bozulma | ✅ "bilinmeyen kontrol mesajı sessiz yok sayılır — kanal AÇIK" + requester timeout (503) + responder throw → failed sonucu (kanal kapanmaz) |
| K4 | Protokol değişikliği YOK — yalnız messages.ts'e iki tip | ✅ codec/connector/client/proxy DOKUNULMADI (grep kanıtı: değişiklik yalnızca messages.ts + testleri) |

## 4. Sapmalar (kayıt)

| Kod | Sapma | Neden |
|:----|:------|:------|
| S-1 | `operationExecuteSchema` STRICT + `type` zarfı şemaya DAHİL | Güvenilmez boss girdisi tüm frame olarak doğrulanır; telemetry-query şemasından daha sıkı (orada non-strict strip vardı) |
| S-2 | `OperationRequester` timeout 30 sn (spec 15 sn senkron bekleme kural motoru içindi — boss operatör tetiklemesi uzun yürütmelere izin verir) | WS-TUNNEL §8 "operation-result yerine timeout"; çapraz sistem yürütme 15 sn'yi aşabilir |
| S-3 | Boss'ta koşu kalıcılığı YOK — yalnızca yönlendirir (sonuç döner; `operation_runs` field'da) | WS-TUNNEL §5.2: "boss operasyonu YÜRÜTMEZ, yalnızca yönlendirir" |
| S-4 | Uzak rollback `system_unreachable` ile fail eder (otomatik retry YOK) | §7.2 birebir: "otomatik yeniden deneme YOKTUR (operatör manuel tamamlar)" |
| S-5 | **C4 (admin UI sistem seçimi) İP-7'ye (Faz D2 frontend) bırakıldı** — API tarafı HAZIR (şema + CRUD uzak adımları kabul eder; yürütme kanalı C1 ile gerçek) | §11.3 kendi notu: "Uzak adım desteği gelene kadar admin yalnızca yerel sistem tanımları oluşturabilir" — uzak adım desteği ŞİMDİ geldi; UI kurucusu frontend dalgasının parçası |

## 5. Gözle Kontrol — K4 Regresyon Yüzeyi (2026-09-22)

`git diff --stat` (İP-5): `packages/ws-tunnel/src/protocol/messages.ts` (+test) dışında ws-tunnel'da DOSYA DEĞİŞMEDİ — codec/connector/client/proxy/session-gateway yolları sıfır regresyon yüzeyi. Connector'ın "bilinmeyen tip → subscriber" dağıtımı (`tunnel-connector.ts` default case) İP-5 ÖNCESİ zaten mevcuttu — operasyon mesajları bu yoldan akar.

`review_date: 2026-09-22`
