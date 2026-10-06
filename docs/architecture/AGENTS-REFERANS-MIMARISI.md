---
status: active
space: architecture
tags: [mimari, dokumantasyon, agents, referans, spec]
review_date: 2026-12-01
---

# AGENTS Referans Sistemi — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ Approved (2026-10-01) — T-1…T-8 tamam. **REV.02 🟢 Doğrulanmış (2026-10-05) — T-9/T-10 tamam, doğrulama KAPANIŞ'ta.**
>
> **REV.01 (2026-10-01):** SC-1 satır-sayısı hedefinden "alan-detayı başlığı yok"
> denetimine çevrildi. Gerekçe: büyük satır kısalması (893→293) bu SPEC'ten önceki
> ayrı görevde yapıldı; bu paketin ölçüsü **sahiplik/ayrışma**dır, ham satır sayısı değil.
> Onay sahibine bildirilir (bkz. KAPANIŞ §A.4).
> **REV.02 (2026-10-05):** Referans tablosu **yönlendirme tablosuna** genişletilir —
> her satıra yol/sembol/görev **Tetik** ve **Birlikte oku** sütunları eklenir. Amaç:
> referansın doğru görevde context'e katılması (keşfedilebilirlik → yönlendirme).
> Karar K-9; hedef tablo §4.3; yeni UC-5; T-9/T-10.
> **İlişkili:** [SPEC-SABLONU.md](SPEC-SABLONU.md), [KOMUT-MANEVRA-OPERASYON-MIMARISI.md](KOMUT-MANEVRA-OPERASYON-MIMARISI.md), [DEVICE-SERVICE-MIMARISI.md](DEVICE-SERVICE-MIMARISI.md), [WS-TUNNEL-URUN-TESCILI.md](WS-TUNNEL-URUN-TESCILI.md).

## 1. Amaç ve Bağlam

`AGENTS.md` her oturumda tüm içeriğiyle yüklenir. Bu nedenle yalnızca **her göreve
uygulanan kuralları** ve günlük komutları taşımalıdır; alan-bazlı detaylar ayrı
referans dosyalarına taşınmalıdır. Önceki bölünme (AGENTS-INFRA / INTEGRATION /
FRONTEND / UI / DOMAIN) iki sorun üretti:

- **Kaba eşleşme:** `AGENTS-INTEGRATION.md` üç ayrı domain'i (tunnel protokolü,
  tünel oturumu, device transport) tek dosyada karıştırır; `AGENTS-DOMAIN.md`
  ise ne komut ne manevra otoritesini doğru yansıtır.
- **Bayat içerik:** `AGENTS-DOMAIN.md` artık var olmayan `maneuvers.ts` / `MANEUVERS`
  frontend kataloğunu anlatır (bkz. §3 B-1); ayrıca `TelemetryTagger` gibi config
  alanına ait kurallar her-görev bloğunda gereksiz yer kaplar.

Bu SPEC, referans sistemini **ince taneli, domain-bazlı, tek-sahipli** hale getirir;
kapsam tablosu:

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| AGENTS.md çekirdeği | Kural + komut sadeleştirmesi, referans tablosu | Alan detayı |
| Referans dosyaları | Domain bölünmesi, isimlendirme, sahiplik | Doküman üretim süreci (AGENTS.md'de) |
| Kalite kapısı | `spec:check`, link bütünlüğü, `review_date` | İçerik doğruluğu (domain SPEC'lerinde) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K-1 | AGENTS.md yalnızca her-görev kuralları + günlük komutlar taşır | Alan detayı ve uzun örnekler referans dosyalara taşınır |
| K-2 | Referanslar domain'e göre ince bölünür | INFRA, DEVICE-CONFIG, WS-TUNNEL, DEVICE-SERVICE, KOMUT-MANEVRA, FRONTEND, UI |
| K-3 | Telemetry tagging & canonical metrics `AGENTS-DEVICE-CONFIG.md`'ye taşınır | AGENTS.md'de tek satır pointer kalır |
| K-4 | Çift-write YASAK — her bilgi tek dosyada sahiptir | `AGENTS-INTEGRATION.md` ve `AGENTS-DOMAIN.md` silinir |
| K-5 | `AGENTS-KOMUT-MANEVRA.md`, `KOMUT-MANEVRA-OPERASYON-MIMARISI.md`'yi tek otorite kabul eder | Bayat `MANEUVERS` katalog anlatımı gider, registry/executor özetlenir |
| K-6 | Cihaz alarm sözleşmesi AGENTS.md'de kısa MANDATORY özet olarak kalır | Detay `DEVICE-SERVICE-MIMARISI.md` §4.2'de; güvenlik kuralı görünür kalır |
| K-7 | Her referans dosyasında `review_date`; AGENTS.md tablo satırı ↔ dosya başlığı birebir | Eskime kapısı ve keşfedilebilirlik |
| K-8 | AGENTS dosyaları kökte yaşar | `docs/architecture/` yalnız mimari dokümanlara ayrılır |
| K-9 | Referans yükleme yönlendirmesi tablo **Tetik** sütununa dayanır | Görev başında dokunulacak yol/sembol/anahtar kelimeler tablo ile eşleştirilir; eşleşen TÜM satırlar + **Birlikte oku** sütunundakiler okunur. Eşleşme belirsizse referans dosyası okunur (küçük dosya, maliyet düşük) |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B-1 | `AGENTS-DOMAIN.md` bayat: anlattığı frontend `MANEUVERS` kataloğu kaldırıldı | `apps/container-web/src/features/control/maneuvers.ts` artık yok; yerine `services/maneuverApi.ts` + `components/ManeuverPanel.tsx`; `KOMUT-MANEVRA-OPERASYON-MIMARISI.md` §13 Faz D2 "TAMAM" |
| B-2 | `AGENTS-INTEGRATION.md` üç ayrı sözleşmeyi tek dosyada karıştırır | Başlıklar: "TunnelConnector sözleşmesi" + "Tünel sözleşmesi" + "Device transport strategy" |
| B-3 | `TelemetryTagger`/canonical kuralı her-görev bloğunda | `AGENTS.md` "Telemetry tagging & canonical metrics (MANDATORY)" bölümü |
| B-4 | Kökteki AGENTS dosyalarında frontmatter `space: architecture` bayat | Beş `AGENTS-*.md` frontmatter'ı |

## 4. Mimari

### 4.1 Hedef bilgi haritası

```
AGENTS.md                         # her oturumda yüklenir: kural + komut + referans tablosu
AGENTS-INFRA.md                   # monorepo, paket tablosu, DI kontratları, desenler, framework, SIGILL
AGENTS-DEVICE-CONFIG.md           # YENİ — telemetry tagging & canonical metrics
AGENTS-WS-TUNNEL.md               # YENİ — TunnelConnector + tünel protokol/oturum sözleşmesi
AGENTS-DEVICE-SERVICE.md          # YENİ — device transport strategy (Strategy/Adapter)
AGENTS-KOMUT-MANEVRA.md           # YENİ (DOMAIN yerine) — komut config + manevra/operasyon özeti
AGENTS-FRONTEND.md                # transport/provider kontratları, veri akışı
AGENTS-UI.md                      # icon / renk token / sprite
```

### 4.2 Bilgi sahipliği (tek kaynak)

| Konu | Sahip dosya | Derin otorite |
|:-----|:------------|:--------------|
| Telemetry tagging + canonical | `AGENTS-DEVICE-CONFIG.md` | — |
| TunnelConnector + tünel sözleşmesi | `AGENTS-WS-TUNNEL.md` | `WS-TUNNEL-URUN-TESCILI.md` |
| Device transport | `AGENTS-DEVICE-SERVICE.md` | `DEVICE-SERVICE-MIMARISI.md` |
| Komut / manevra / operasyon | `AGENTS-KOMUT-MANEVRA.md` | `KOMUT-MANEVRA-OPERASYON-MIMARISI.md` |
| Cihaz alarm özeti | `AGENTS.md` (kısa) | `DEVICE-SERVICE-MIMARISI.md` §4.2 |
| Frontend veri akışı | `AGENTS-FRONTEND.md` | — |
| Icon / renk / sprite | `AGENTS-UI.md` | `SPRITE-URETIMI.md`, `SPRITE-STYLE-KIT.md` |

### 4.3 Yönlendirme tablosu (AGENTS.md'de görünecek hedef — REV.02)

Yükleme kuralı (K-9): görev başında dokunulacak yollar/semboller **Tetik** sütunuyla
eşleştirilir; eşleşen tüm satırlar ve **Birlikte oku** sütunundaki dosyalar okunur.

| Dosya | Konu | Tetik (yol / sembol / görev) | Birlikte oku |
|:------|:-----|:-----------------------------|:-------------|
| `AGENTS-INFRA.md` | Monorepo, paket tablosu, DI, desenler, sürümler, SIGILL | Yeni paket/workspace; `nx.json`; tsconfig build; DI arayüzü; framework sürümü | — |
| `AGENTS-DEVICE-CONFIG.md` | Telemetry tagging & canonical metrics | `services/device-service/deployment/sample-config/*.json`; kök `configs/`; `canonical`; `TelemetryTagger` akışı; telemetri/tag/bitfield alanı | `AGENTS-DEVICE-SERVICE.md` |
| `AGENTS-WS-TUNNEL.md` | Tunnel / TunnelConnector sözleşmeleri | `packages/ws-tunnel/**`; `TunnelConnector`; `FrameCodec`; `SessionGateway`; `TunnelProxy`; frame/stream/session işi | `AGENTS-KOMUT-MANEVRA.md` (boss→field kanalı) |
| `AGENTS-DEVICE-SERVICE.md` | Device transport strategy | `packages/core/src/modbus/**`; `packages/simulators/**`; `services/device-service/**`; `ModbusDevice`; `IModbusTransport`; `SimulatorRegistry` | `AGENTS-DEVICE-CONFIG.md` |
| `AGENTS-KOMUT-MANEVRA.md` | Komut config / manevra / operasyon | `packages/platform/commands/**`; `maneuver-routes.ts`; `operation-boss-routes.ts`; `maneuvers.json`; `operations.json` | `AGENTS-WS-TUNNEL.md`, `AGENTS-DEVICE-CONFIG.md` |
| `AGENTS-FRONTEND.md` | Frontend transport & provider kontratları | `packages/ui/src/transports/**`; `packages/ui/src/interfaces/**`; `TransportContext.tsx`; `ITelemetryTransport`; provider/hook veri akışı | `AGENTS-UI.md` |
| `AGENTS-UI.md` | Icon / renk token / sprite pipeline | `packages/ui/src/icons/**`; `packages/ui/src/colors/**`; `packages/ui/src/assets/**`; `packages/ui/src/graphics/**`; `SCADA_ICONS`; `COLORS`; `sprite:*`; `sprites-spec.mjs` | `AGENTS-FRONTEND.md` |

## 5. Purity Kuralları (ZORUNLU)

1. **Tek sahiplik:** Bir bilgi yalnızca bir referans dosyasında ayrıntılı yaşar; diğer dosyalar link verir, kopyalamaz.
2. **Çekirdek saflığı:** AGENTS.md'de alan detayı bulunamaz (yalnız kural + pointer).
3. **MANDATORY görünürlük:** Güvenlik-kritik kural (alarm) AGENTS.md'de kısa özet olarak görünür kalır.
4. **Kod referansı:** Yalnız `path/file.ts#sembol` çapası kullanılır; satır numarası ile referans yasak.
5. **Bayat içerik yasağı:** Artık var olmayan dosya/katalog (örn. `maneuvers.ts`, `MANEUVERS`) referans dosyalarında yer alamaz.
6. **Kökte konum:** AGENTS dosyaları repo kökünde; `docs/architecture/` yalnız SPEC/KAPANIŞ ve mimari dokümanlara ayrılır.

## 6. Use Case'ler

### 6.1 UC-1 — Domain-bazlı referans bölünmesi

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: `AGENTS-INTEGRATION.md` içeriğinin `AGENTS-WS-TUNNEL.md` + `AGENTS-DEVICE-SERVICE.md` olarak bölünmesi; `AGENTS-DOMAIN.md` → `AGENTS-KOMUT-MANEVRA.md`
- hariç: referans dosyalarının içerik otoritesi (ilgili SPEC'lerde)

**Akış:**
1. INTEGRATION'dan tunnel bölümleri WS-TUNNEL'e, device transport DEVICE-SERVICE'e kopyalanır.
2. DOMAIN dosyası güncel komut/manevra/operasyon özetiyle yeniden adlandırılır.
3. INTEGRATION ve DOMAIN silinir; AGENTS.md tablosu güncellenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | System MUST remove `AGENTS-INTEGRATION.md`; TunnelConnector + Tünel sözleşmesi `AGENTS-WS-TUNNEL.md`'de olmalı | AK-1.1 |
| FR-1.2 | Device transport strategy `AGENTS-DEVICE-SERVICE.md`'de olmalı ve `DEVICE-SERVICE-MIMARISI.md`'ye link içermeli | AK-1.2 |
| FR-1.3 | System MUST remove `AGENTS-DOMAIN.md`; yerine `AGENTS-KOMUT-MANEVRA.md` geçmeli | AK-1.3 |
| FR-1.4 | `AGENTS-KOMUT-MANEVRA.md` bayat `maneuvers.ts`/`MANEUVERS` anlatımı İÇERMEMELİ; registry/executor akışını özetlemeli | AK-1.4 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** repo kökü **WHEN** `AGENTS-INTEGRATION.md` aranır **THEN** dosya yoktur ve `AGENTS-WS-TUNNEL.md` her iki tünel sözleşmesini taşır
2. **AK-1.2 — GIVEN** `AGENTS-DEVICE-SERVICE.md` **WHEN** incelenir **THEN** device transport strategy ve `DEVICE-SERVICE-MIMARISI.md` linki bulunur
3. **AK-1.3 — GIVEN** repo kökü **WHEN** manevra referansı aranır **THEN** `AGENTS-DOMAIN.md` yoktur, `AGENTS-KOMUT-MANEVRA.md` vardır
4. **AK-1.4 — GIVEN** `AGENTS-KOMUT-MANEVRA.md` **WHEN** `MANEUVERS` için taranır **THEN** yalnızca kayıt (registry) bağlamındaki ifadeler geçer, frontend katalog anlatımı yoktur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | INTEGRATION silinmiş; WS-TUNNEL iki tünel sözleşmesini içerir | dosya | 🟢 |
| AK-1.2 | DEVICE-SERVICE dosyası transport strategy + otorite linki taşır | dosya | 🟢 |
| AK-1.3 | DOMAIN silinmiş; KOMUT-MANEVRA var | dosya | 🟢 |
| AK-1.4 | KOMUT-MANEVRA'da bayat katalog anlatımı yok | grep | 🟢 |

**T Görev Listesi:**
- [x] T-1: `AGENTS-WS-TUNNEL.md` + `AGENTS-DEVICE-SERVICE.md` oluştur (INTEGRATION'ı böl)
- [x] T-2: `AGENTS-KOMUT-MANEVRA.md` oluştur; `AGENTS-INTEGRATION.md` ve `AGENTS-DOMAIN.md` sil

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| INTEGRATION'da başka dosyaya link varsa | Bölme sırasında ilgili dosyaya taşınır (kaybolmaz) |
| DOMAIN'de komut config bölümü değişmemişse | Aynen korunur, yalnız manevra bölümü güncellenir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `AGENTS-WS-TUNNEL.md` | Yeni sahip: tunnel sözleşmeleri |
| `AGENTS-DEVICE-SERVICE.md` | Yeni sahip: device transport |
| `AGENTS-KOMUT-MANEVRA.md` | Yeni sahip: komut/manevra/operasyon |
| `AGENTS-INTEGRATION.md` | Silinir |
| `AGENTS-DOMAIN.md` | Silinir |

### 6.2 UC-2 — Telemetry/canonical'ın taşınması

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: telemetry tagging & canonical metrics'in `AGENTS-DEVICE-CONFIG.md`'ye taşınması
- hariç: diğer config/env kuralları (AGENTS.md'de kalır)

**Akış:**
1. `AGENTS-DEVICE-CONFIG.md` oluşturulur, telemetry/canonical içeriği taşınır.
2. AGENTS.md'den detay çıkarılır, kısa pointer eklenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Telemetry tagging & canonical metrics içeriği `AGENTS-DEVICE-CONFIG.md`'de olmalı | AK-2.1 |
| FR-2.2 | AGENTS.md telemetry tagging detayı İÇERMEMELİ; `AGENTS-DEVICE-CONFIG.md`'ye pointer bulunmalı | AK-2.2 |
| FR-2.3 | `AGENTS-DEVICE-CONFIG.md` yalnız telemetry/canonical kapsamı taşımalı (başka config kuralı değil) | AK-2.3 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** `AGENTS-DEVICE-CONFIG.md` **WHEN** incelenir **THEN** `TelemetryTagger` sahiplik yasağı ve `canonical` alan kuralı anlatılır
2. **AK-2.2 — GIVEN** `AGENTS.md` **WHEN** taranır **THEN** telemetry tagging detayı yoktur ve `AGENTS-DEVICE-CONFIG.md` bağlantısı vardır
3. **AK-2.3 — GIVEN** `AGENTS-DEVICE-CONFIG.md` başlıkları **WHEN** listelenir **THEN** yalnız telemetry/canonical bölümleri görünür

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | DEVICE-CONFIG telemetry tagging + canonical kuralını taşır | dosya | 🟢 |
| AK-2.2 | AGENTS.md'de telemetry detayı yok, pointer var | grep | 🟢 |
| AK-2.3 | DEVICE-CONFIG kapsamı yalnız telemetry/canonical | dosya | 🟢 |

**T Görev Listesi:**
- [x] T-3: `AGENTS-DEVICE-CONFIG.md` oluştur (AGENTS.md'den telemetry tagging taşı)
- [x] T-4: AGENTS.md'den telemetry tagging bloğunu çıkar, pointer ekle

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Canonical TODO notu | Taşınır; içerik değişmez |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `AGENTS-DEVICE-CONFIG.md` | Yeni sahip: telemetry/canonical |
| `AGENTS.md` | Detay çıkar, pointer kalır |

### 6.3 UC-3 — AGENTS.md sadeleşmesi ve tablo hizalaması

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: referans tablosunun 7 dosyaya güncellenmesi, frontmatter hizalaması
- hariç: yeni kural ekleme

**Akış:**
1. AGENTS.md referans tablosu hedef sete göre yeniden yazılır.
2. Tüm AGENTS-*.md frontmatter `review_date` + `space: agents` olarak hizalanır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | AGENTS.md referans tablosu 7 hedef dosyayı doğru konu eşleşmesiyle listeler | AK-3.1 |
| FR-3.2 | Her referans dosyası frontmatter'ında `review_date` taşır | AK-3.2 |
| FR-3.3 | Kökteki her referans dosyası frontmatter'ında `space: agents` taşır | AK-3.3 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** AGENTS.md referans tablosu **WHEN** okunur **THEN** 7 satır vardır ve her satır var olan bir dosyaya işaret eder
2. **AK-3.2 — GIVEN** her AGENTS-*.md **WHEN** frontmatter okunur **THEN** `review_date` alanı bulunur
3. **AK-3.3 — GIVEN** her AGENTS-*.md **WHEN** frontmatter okunur **THEN** `space: agents` değeri görünür

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Tablo 7 satır, tüm hedefler mevcut | dosya | 🟢 |
| AK-3.2 | Tüm AGENTS-*.md `review_date` içerir | grep | 🟢 |
| AK-3.3 | Tüm AGENTS-*.md `space: agents` içerir | grep | 🟢 |

**T Görev Listesi:**
- [x] T-5: AGENTS.md sadeleştir; referans tablosunu 7 dosyaya güncelle
- [x] T-6: Tüm AGENTS-*.md frontmatter'ı `review_date` + `space: agents` hizala

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Tablo satırı var ama dosya yok | Kırık link kapısında yakalanır (UC-4) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `AGENTS.md` | Tablo + sadeleşme |
| `AGENTS-*.md` | Frontmatter hizalaması |

### 6.4 UC-4 — Kalite kapısı

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: `spec:check`, göreli md link bütünlüğü, KAPANIŞ üretimi
- hariç: otomatik link-check script'i (§11 ileri iş)

**Akış:**
1. SPEC ve tüm AGENTS-*.md üzerinde `bun run spec:check` çalıştırılır.
2. md linkleri toplanıp hedefleri varlık kontrolünden geçirilir.
3. KAPANIŞ dokümanı üretilir, spec:check ile doğrulanır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | `bun run spec:check` bu SPEC ve KAPANIŞ için 0 hata vermeli | AK-4.1 |
| FR-4.2 | AGENTS.md ve tüm AGENTS-*.md göreli md linkleri mevcut hedeflere işaret etmeli | AK-4.2 |
| FR-4.3 | KAPANIŞ dokümanı A.1-A.6 + B.1-B.2 formatında ve `review_date` ile üretilmeli | AK-4.3 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** SPEC dosyası **WHEN** `bun run spec:check` çalıştırılır **THEN** 0 hata raporlanır
2. **AK-4.2 — GIVEN** kökteki AGENTS dosyaları **WHEN** md linkleri toplanır **THEN** her hedef mevcut dosyadır (kırık link yok)
3. **AK-4.3 — GIVEN** IMPL tamamlanmış **WHEN** KAPANIŞ yazılır **THEN** zorunlu bölümleri içerir ve spec:check 0 hata verir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | spec:check 0 hata | komut | 🟢 |
| AK-4.2 | Kırık md linki yok | komut | 🟢 |
| AK-4.3 | KAPANIŞ zorunlu bölümler + review_date | dosya | 🟢 |

**T Görev Listesi:**
- [x] T-7: Doğrulamayı çalıştır (spec:check + link bütünlüğü), kanıtları topla
- [x] T-8: `AGENTS-REFERANS-KAPANIS.md` üret (A.1-A.6 + B.1-B.2)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| DIğer doküman AGENTS-INTEGRATION'a link veriyorsa | Taşıma öncesi taranır; link yeni dosyaya güncellenir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `docs/architecture/AGENTS-REFERANS-KAPANIS.md` | Yeni: doğrulama + test kapsamı |
| `tools/spec-check.mjs` | Değişmez (kapı olarak kullanılır) |

### 6.5 UC-5 — Yönlendirme tablosu

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: AGENTS.md referans tablosunun **Tetik** (yol/sembol/görev) + **Birlikte oku** sütunlarıyla genişletilmesi; yükleme kuralı (K-9)
- hariç: referans dosyalarının içerik otoritesi; KAPANIŞ kanıt satırı; SPEC şablonu alanı (ileri iş)

**Akış:**
1. §4.3 hedef tablosu AGENTS.md'deki mevcut 2 sütunlu tablonun yerine geçer.
2. Yükleme kuralı (K-9) tablonun üstünde tek paragraf olarak yazılır.
3. `bun run spec:check` ile SPEC doğrulanır; KAPANIŞ (REV.02) güncellenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | AGENTS.md referans tablosu her satırda **Tetik** sütunu taşımalı (yol veya sembol veya görev anahtar kelimesi) | AK-5.1 |
| FR-5.2 | Tablo her satırda **Birlikte oku** sütunu taşımalı (boş = `—`) | AK-5.2 |
| FR-5.3 | Tablo üstünde K-9 yükleme kuralı görünür olmalı (eşleşen tüm satırlar + kombinasyon okunur) | AK-5.3 |
| FR-5.4 | `bun run spec:check` bu SPEC için 0 hata vermeli | AK-5.4 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** görev `packages/ws-tunnel/src/codec` dosyasına dokunacak **WHEN** tablo Tetik sütununa bakılır **THEN** `AGENTS-WS-TUNNEL.md` satırı eşleşir
2. **AK-5.2 — GIVEN** `AGENTS-DEVICE-CONFIG.md` satırı **WHEN** okunur **THEN** Birlikte oku hücresinde `AGENTS-DEVICE-SERVICE.md` görünür
3. **AK-5.3 — GIVEN** AGENTS.md referans bölümü **WHEN** okunur **THEN** yükleme kuralı paragrafı ve 4 sütunlu tablo birlikte bulunur
4. **AK-5.4 — GIVEN** SPEC dosyası **WHEN** `bun run spec:check` çalıştırılır **THEN** 0 hata raporlanır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Tetik sütunu yol/sembol/anahtar kelime içerir | dosya | 🟢 |
| AK-5.2 | Birlikte oku sütunu dolu veya `—` | dosya | 🟢 |
| AK-5.3 | Yükleme kuralı paragrafı + 4 sütunlu tablo birlikte | dosya | 🟢 |
| AK-5.4 | spec:check 0 hata | komut | 🟢 |

**T Görev Listesi:**
- [x] T-9: AGENTS.md referans tablosunu §4.3 4 sütunlu yönlendirme tablosuna güncelle + K-9 yükleme kuralı paragrafını ekle
- [x] T-10: `AGENTS-REFERANS-KAPANIS.md`'yi REV.02 için güncelle (A.1 matrisi + doğrulama)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Hiçbir satır eşleşmezse | Referans yüklenmez; dosya küçük olduğundan şüphe halinde okumak güvenlidir (K-9) |
| Birden fazla satır eşleşirse | Eşleşen tüm satırlar + Birlikte oku kombinasyonları okunur |
| Tablo hücresinde `|` karakteri gerekirse | Kaçışlanır veya virgülle ayrılır — tablo bozulmaz |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `AGENTS.md` | Referans tablosu → yönlendirme tablosu + kural paragrafı |
| `docs/architecture/AGENTS-REFERANS-KAPANIS.md` | REV.02 doğrulaması |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| ✏️ Specified | SPEC yazıldı, developer onayı beklenir; dosya işlemi YOK |
| ✅ Approved | Onay sonrası IMPL görevleri başlar |
| 🟡 Geliştirmede | Dosya bölme/taşıma/silme işlemleri sürer |
| 🟢 Doğrulanmış | KAPANIŞ üretildi, spec:check + link kapısı yeşil |
| ⛔ Defer | Kapsam dışı bırakıldı |
| Hata: kırık md link | KAPANIŞ öncesi düzeltilir; merge engeli |
| Hata: spec:check >0 | İlgili bölüm düzeltilir; merge engeli |
| Hata: çift-sahip içerik | Tek sahiplik kuralı gereği kopya kaldırılır |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | AGENTS.md yalnız kural + komut + referans tablosu taşır; alan-detayı başlığı (telemetry/tunnel/device-transport/manevra) bulunmaz | `grep '^## ' AGENTS.md` başlık denetimi |
| SC-2 | Referans sistemi 7 domain dosyası + çekirdek | `ls AGENTS-*.md` sayım |
| SC-3 | Kırık göreli md linki yok | link tarama komutu |
| SC-4 | `spec:check` SPEC + KAPANIŞ için 0 hata | `bun run spec:check` |
| SC-5 | Bayat referans (frontend `MANEUVERS` katalog anlatımı) kalmadı | grep |
| SC-6 | AGENTS.md referans tablosu 4 sütunlu yönlendirme tablosudur (Dosya, Konu, Tetik, Birlikte oku) ve yükleme kuralı görünür | tablo başlık denetimi |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | YOK — doküman/konfigürasyon işi (kod davranışı yok) |
| 3. TEST | Doğrulama komutları: `spec:check` + link tarama (T-7) |
| 4. IMPL | T-1…T-6 dosya işlemleri; **REV.02: T-9 yönlendirme tablosu** |
| 5. KAPANIŞ | `docs/architecture/AGENTS-REFERANS-KAPANIS.md` (Doğrulama + Test Kapsamı); **REV.02: T-10 güncelleme** |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | Dosya adı `AGENTS-CONFIG` yerine `AGENTS-DEVICE-CONFIG` seçildi | ✅ Kapalı — kullanıcı kararı |
| A-2 | Alarm sözleşmesinin tüm detayının taşınması | ✅ Kapalı — AGENTS.md'de kısa özet kalır (K-6) |
| A-3 | Link bütünlüğünün otomatik CI kapısına bağlanması | §11 ileri iş |
| A-4 | Yönlendirme sinyali seçimi (yol + sembol + görev anahtar kelimesi) | ✅ Kapalı — K-9 (REV.02) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `tools/agents-link-check.mjs` + npm script ile otomatik link bütünlüğü kapısı.
2. AGENTS-*.md frontmatter için şema lint'i (`review_date` zorunluluğu).

## 12. T Görev Özeti

| Kod | Görev | İlgili |
|:----|:------|:-------|
| T-1 | `AGENTS-WS-TUNNEL.md` + `AGENTS-DEVICE-SERVICE.md` oluştur (INTEGRATION'ı böl) | UC-1 |
| T-2 | `AGENTS-KOMUT-MANEVRA.md` oluştur; INTEGRATION + DOMAIN sil | UC-1 |
| T-3 | `AGENTS-DEVICE-CONFIG.md` oluştur (telemetry tagging taşı) | UC-2 |
| T-4 | AGENTS.md'den telemetry tagging bloğunu çıkar, pointer ekle | UC-2 |
| T-5 | AGENTS.md sadeleştir; referans tablosunu 7 dosyaya güncelle | UC-3 |
| T-6 | Tüm AGENTS-*.md frontmatter'ı `review_date` + `space: agents` hizala | UC-3 |
| T-7 | Doğrulamayı çalıştır (spec:check + link bütünlüğü), kanıtları topla | UC-4 |
| T-8 | `AGENTS-REFERANS-KAPANIS.md` üret (A.1-A.6 + B.1-B.2) | UC-4 |
| T-9 | AGENTS.md referans tablosunu 4 sütunlu yönlendirme tablosuna güncelle + K-9 kuralı | UC-5 |
| T-10 | `AGENTS-REFERANS-KAPANIS.md`'yi REV.02 için güncelle | UC-5 |

---

*review_date: 2026-12-01 — ✅ Approved (2026-10-01) T-1…T-8; REV.02 🟢 Doğrulanmış (2026-10-05, T-9/T-10). Doğrulama: [AGENTS-REFERANS-KAPANIS.md](AGENTS-REFERANS-KAPANIS.md).*
