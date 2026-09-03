---
status: plan
space: roadmap
tags: [ws-tunnel, kutuphane, jenerik, yol-haritasi, v1]
review_date: 2026-09-01
---

# ws-tunnel Kütüphane Jenerikleştirme Yol Haritası (v1 kütüphane iddiası)

> **Tarih:** 2026-09-01 · **Durum:** PLAN
> **Bağlam:** Faz A+B tamam (ws-tunnel 214 test; bağımlılık `ws` + `zod` + `@gd-monorepo/result` — Result 2026-09-01'de ayrı yaprak pakete taşındı) — bkz. [KUTUPHANE-CIKARMA-PLANI.md](../architecture/KUTUPHANE-CIKARMA-PLANI.md).
> **Hedef:** "kendi TelemetryData formatı + custom kontrol mesajları + özel upstream + kendi auth doğrulaması" senaryolarını dış mühendislerin **pakete dokunmadan** kurabilmesi.

## 1. Mevcut durum (genericlik envanteri)

**Zaten jenerik:** codec/protokol çerçevesi, backoff, durum makinesi; enjeksiyon dikişleri (`ISocketClientFactory`, `ILogger`, `ITokenSigner`, `IAuditSink`, `ISnapshotSource`, `ITunnelChannel`, `IFieldChannel`, `IStreamSink`); `TunnelRole`/`TunnelUser`/`TunnelTelemetryPoint` (yapısal uyum — kendi telemetri formatın extra alanlarla akar); modül bağımsızlığı (yalnızca `connector` + `codec` + `channel` kullanılabilir — MQTT-benzeri saf veri kanalı); auth doğrulaması tamamen tüketici tarafında (register-ack kararı core'a ait).

**Kapalı/şekilli kalanlar:** kontrol mesaj seti kapalı (tiplenmiş custom mesaj API'si yok — bilinmeyen tipler `onMessage`'a akar, sadece tiplenmemiş); `TunnelClient` sabit 2-upstream kuralı (`/api/*`,`/ws/*` → webServiceUrl, diğer → staticUrl); operational config şeması kapalı (yalnız heartbeat/telemetry aralıkları); `FieldSessionStore`/`ContainerSessionStore` somut sınıf (arayüz yok); path allowlist helper GD-PMS şekilli (enforcement tüketicide — düşük risk); paketleme yok (0.1.0 private, LICENSE yok, dual build yok, Node matrisi yok, API dokümanı yok).

## 2. Faz G1 — Ucuz jenerikleştirme (non-breaking, v0.1.x)

| # | İş | Yöntem (TDD) | Kapı |
|---|---|---|---|
| G1.1 | **Custom mesaj deseni:** `TunnelExtension` yardımcısı — `onMessage` tip filtresi + `sendControl` yanıt deseni; bilinmeyen mesajların akışı zaten var, tiplenir | `src/extension/tunnel-extension.ts` + test (kendi command frame örneğiyle) | ws-tunnel testleri + monorepo yeşil |
| G1.2 | **Auth esnekliği:** `FieldConnectorConfig.additionalHeaders?` (Bearer'a ek header'lar — API key/imza); Bearer + custom `ISocketClientFactory` desenleri dokümante | config doğrulama + header birleştirme testleri | aynı |
| G1.3 | **Session store sözleşmeleri:** `IFieldSessionStore` + `IContainerSessionStore` arayüzleri; mevcut sınıflar implement eder, constructor'lar arayüz alır | mevcut testler taşınır + arayüz uyum testi | aynı |
| G1.4 | **Upstream yönlendirici:** `IUpstreamRouter` enjeksiyonu (`TunnelClient`); varsayılan implementasyon = bugünkü api/static kuralı | router birim testi + varsayılan davranış regresyonu | aynı |
| G1.5 | **Örnek proje:** `examples/custom-iot.ts` — kendi `MyTelemetry` formatı + custom mesaj + özel auth doğrulamalı loopback | örnek çalıştırılır + README'ye akış şeması | demo PASS |

## 3. Faz G2 — Kırıcı genelleme (v0.2 — ayrı semver, PLAN olarak saklı)

| # | İş | Not |
|---|---|---|
| G2.1 | Payload genellemesi: `ISnapshotSource<T>` + `FieldConnector`'da snapshot tipini serbest bırakmak | Kırıcı — mevcut `TunnelTelemetryPoint` varsayılan kalır |
| G2.2 | Telemetri push politikası soyutlaması: `IPushPolicy` (aralık + frame üretimi) | Push istemeyen kullanıcılar için no-op politika |
| G2.3 | Custom operational config deseni: `config-update`'e ek alan taşıma yolu (şema passthrough DEĞİL — kırılganlık; ayrı custom frame deseni) | G1.1 ile birleşir |

## 4. Faz G3 — Paketleme/pazarlama (açık kararlara bağlı)

LICENSE/EULA kararı (§8, KUTUPHANE-CIKARMA-PLANI.md) → ESM+CJS dual build → `engines` + Node 18/20/22 CI matrisi → typedoc API referansı → CHANGELOG + semver politikası → npm/private registry publish.

**Bu faz, "şimdilik yayına lisansa gerek yok" kararıyla DONDURULDU** — yalnızca LICENSE kararı verilince açılır.

## 5. v1 kütüphane iddiası — kabul kriterleri

1. `examples/custom-iot.ts` senaryosu çalışır: kendi telemetri formatı, custom mesaj, özel auth, özel upstream kuralı — paket kodu DEĞİŞMEZ.
2. Dış bir mühendis README + typedoc ile, monorepo'ya bakmadan entegrasyon kurabilir (yürüyüş kontrolü: taze dizinde sıfırdan kurulum).
3. Tüm mevcut kapılar korunur: ws-tunnel ≥245 test, tüm monorepo yeşil, typecheck temiz, loopback + tunnel demoları PASS.

## 6. Önceliklendirme

- **Must (v1):** G1.1, G1.3, G1.4, G1.5
- **Should:** G1.2
- **Could (v0.2):** G2.*
- **Won't now:** G3 (karar bekliyor)

**Tahmini efor:** G1 = ~1-2 gün; G2 = ~1 gün + göç; G3 = karar sonrası ~1 gün + CI kurulumu.

---

**Referanslar:** [KUTUPHANE-CIKARMA-PLANI.md](../architecture/KUTUPHANE-CIKARMA-PLANI.md) (ayrım + Faz A/B), [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](../architecture/KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md) (protokol), [test-envanteri.md](./test-envanteri.md) (bölüm 8 — ws-tunnel test dökümü), `packages/ws-tunnel/README.md` (paket dokümanı).
