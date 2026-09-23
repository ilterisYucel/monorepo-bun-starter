---
status: active
space: architecture
tags: [test-kapsami, ws-tunnel, operasyon, faz-c]
review_date: 2026-09-22
---

# WS-TUNNEL Kapasite — Test Kapsamı (İP-5, KOMUT Faz C)

Bağlı tasarım: [WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md](./WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md)
Doğrulama: [WS-TUNNEL-KAPASITE-DOGRULAMA.md](./WS-TUNNEL-KAPASITE-DOGRULAMA.md)

## 1. Senaryo Matrisi

### Mesaj şeması (`messages.test.ts` — 4 durum)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Geçerli istek | type + operationId + name + params + traceId | kabul |
| Eksik/boş alanlar | operationId yok / name boş / type zarf yok | RED |
| Bilinmeyen anahtar | extra | RED (STRICT güven sınırı) |
| Union tipi | execute + result | iki yönü kapsar |

### Executor uzak adım (`operation-executor.test.ts` — 3 durum)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Kanal VAR | remoteChannel enjeksiyonu | delegasyon (system + maneuver + params) |
| Kanal fail | ok:false reason | operasyon failed (kademeli) |
| Uzak rollback | başarılı adım kompanzasyonu | rollback_step_ok; kanal çağrısı |

### TunnelManeuverChannel (`tunnel-maneuver-channel.test.ts` — 6 durum)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| connected + 200 | stream | ok |
| Bağlantı yok | stale/idle | system_unreachable (stream/oturum açılmaz) |
| Stream kontratı | POST /api/maneuvers/:name/execute | params gövdesi birebir |
| Upstream 404 | error gövdesi | ok:false + reason |
| Stream hatası | throw | tunnel_stream_failed |
| Oturum | yoksa programatik / varsa yeniden kullan | birebir |

### OperationResponder (`operation-responder.test.ts` — 5 durum)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Geçerli frame | yürütücü çağrısı (trigger/createdBy/traceId) | completed + results eşlemesi |
| Geçersiz frame | zod RED | rejected(invalid_request); yürütücü ÇALIŞMAZ |
| Rejected sonuç | reason | taşınır |
| Yürütme throw | — | failed sonucu; abonelik KALIR (kanal kapanmaz) |
| Audit | — | operation_boss_request + operation_result_sent |

### OperationRequester (`operation-requester.test.ts` — 3 durum)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Korelasyon | aynı operationId | sonuç çözülür; abonelik sökülür |
| Yabancı frame | farklı id/peer | yok sayılır |
| Timeout | — | undefined + abonelik sökülür |

### Boss rotası (`operation-boss-routes.test.ts` — 5 durum)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| admin/teknik/iç token | — | 200; anonim 403 |
| send argümanları | uuid operationId + params + trace | birebir |
| requester yok | tier uyuşmazlığı | 503 |
| timeout | undefined | 503 operation_timeout |
| rejected | — | AYNEN (200 + status) |

### K1 — gerçek WS (`operation-flow.spec.ts` — 2 durum)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Uçtan uca | loopback WS + register-ack | frame → yürütücü → result aynı kanaldan |
| Bilinmeyen mesaj | bogus frame | sessiz yok sayılır; kanal AÇIK; sonraki istek yanıtlanır |

## 2. KAPSANMAYAN Boşluklar

| # | Boşluk | Neden | Ne zaman |
|:--|:-------|:------|:---------|
| G-1 | C4: field admin UI operasyon kurucusu (sistem seçimi + kayıt) | S-5 — frontend dalgası | İP-7 (Faz D2) |
| G-2 | Gözle demo (canlı iki stack + boss tetikleme) | docker stack + kullanıcı ortamı | devreye alımda |
| G-3 | İki-hop audit'in boss tarafında GÖRÜNTÜLENMESİ (UI) | boss UI operasyon listesi | İP-7 |
| G-4 | operation-execute idempotency'si (aynı operationId running iken rejected) | §8 sözleşmesi — executor şu an tek-instance kontrolü ROTA katmanında değil (B3'te yoktu; §11.2 "bir kaydın yeni çalıştırması önceki running ise reddedilir" — B3 rotada uygulanmadı) | İP-7 ile birlikte değerlendirilir |

`review_date: 2026-09-22`
