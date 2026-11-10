---
status: active
space: architecture
tags: [mimari, tamper-logger, nis2, imzali-log, spec]
review_date: 2026-11-10
---

# Tamper Logger — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `packages/logger` (imzasız logger), `PLATFORM-MIMARISI.md` (eventCode sözlüğü), `docs/standards/nis-2.md`.

## 1. Amaç ve Bağlam

Ayrı proje: tamper-evident imzalı log kütüphanesi. HMAC-SHA256 + hash zinciri ile olayları değiştirilemez biçimde saklar; audit/security kategorilerinde fail-closed, app kategorisinde batch/drop politikası uygular. `tools/verify-log.mjs` ile denetlenebilir (NIS-2 kanıtı).

| Katman | Kapsam |
|:-------|:-------|
| dahil | İmza zinciri, kategori politikaları, redaction, sink fan-out, zincir doğrulama, denetim aracı |
| hariç | İmzasız logger (LOGGER), eventCode sözlüğü (PLATFORM), SIEM servisi (İleri İş) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | HMAC-SHA256 + `prevHash` zinciri: `signature = HMAC(key, prevHash\nseq\ncanonicalize(event))`; canonical JSON anahtar sırasından bağımsız | Değiştirme tespiti |
| K2 | Kategori sözleşmesi: `app` batch'lenir + drop politikası (error → sayaç + degraded); `audit`/`security` **fail-closed** — batch önce flush, sonra anında yaz, hata çağırana yayılır | Denetim kaybı yok |
| K3 | `eventCode` serbest string; proje sözlüğü `eventCodeValidator` ile enjekte edilir, reddedilirse `log()` throw (fail-closed) | Sözlük dışı olay yazılmaz |
| K4 | Redaction: `DEFAULT_REDACTION_KEYS` (password/token/authorization/secret/api_key/apikey), büyük/küçük harf duyarsız + kısmi eşleşme | Sır sızıntısı yok |
| K5 | `verifyChain`: dosya sırası = zincir sırası (sıralama YAPILMAZ); `GENESIS_HASH` yeni segment = servis restart (tamper DEĞİL); ihlal türleri: `missing_event`/`out_of_order`/`signature_mismatch` | Denetim semantiği net |
| K6 | `verify-log.mjs`: `--key` > `--key-file` > `LOG_SIGNING_KEY`; çıkış kodu 0/1/2 | NIS-2 denetim aracı |
| K7 | `log_events` DDL 12 kolon (ts, level, category, event_code, message, context, correlation_id, service, host, seq, prev_hash, signature); hypertable dönüşümü migrasyonda | Şema sabit |
| K8 | Sink'ler: console, file, timescale (tek INSERT/unnest), syslog (RFC 5424, UDP), http-webhook (`X-Signature: sha256=`, retry/backoff), smtp, http-sms, alert-notifier (5 dk cooldown; alert hatası audit'i ETKİLEMEZ) | Fan-out izole |
| K9 | Bağımsızlık: jenerik paket, proje kavramı içermez; tek dış bağımlılık `nodemailer` | Ayrı ürün |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `alert-notifier` cooldown davranışı yalnız unit testle sabit (canlı kanal yok) | `packages/tamper-logger/src/sinks/alert-notifier` |
| B2 | smtp/http-sms sink'leri canlı doğrulanmadı (belirsiz) | aynı dizin |

## 4. Mimari

```text
TamperLogger.log(event)
  ├ kategori politikası (app batch | audit/security fail-closed)
  ├ redaction + enrich (seq, prevHash, host, service)
  ├ canonicalize → signEvent (HMAC)
  └ sink fan-out (console/file/timescale/syslog/webhook/smtp/sms/alert)

verify-log.mjs ──► verifyChain (dosya sırası, GENESIS segmentleri)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/tamper-logger/src/types.ts#LogEvent` | Olay şekli |
| `packages/tamper-logger/src/tamper-logger.ts#TamperLogger` | Orkestratör |
| `packages/tamper-logger/src/pipeline.ts#signEvent` | İmza |
| `packages/tamper-logger/src/pipeline.ts#canonicalize` | Kanonik JSON |
| `packages/tamper-logger/src/verify-chain.ts#verifyChain` | Doğrulama |
| `packages/tamper-logger/src/interfaces.ts#ILogSink` | Sink portu |
| `tools/verify-log.mjs` | Denetim aracı |

## 5. Purity Kuralları (ZORUNLU)

1. Paket jeneriktir; proje kavramı (eventCode sözlüğü, tier) enjekte edilir (K3/K9).
2. Audit/security yolu fail-closed (K2).
3. Sırlar redaction ile maskelenir (K4).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — İmza Zinciri

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: canonicalize, signEvent, prevHash/seq ilerlemesi
- hariç: kategori politikası (UC-2)

**Akış:**
1. Olay redaction + enrich'ten geçer.
2. Canonical JSON üretilir.
3. HMAC imza + zincir state güncellenir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | İmza prevHash + seq + canonical içeriğe bağlıdır | AK-1.1 |
| FR-1.2 | Canonical JSON anahtar sırasından bağımsızdır | AK-1.2 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** olay **WHEN** imzalanır **THEN** prevHash değişince imza değişir
2. **AK-1.2 — GIVEN** aynı içerik farklı anahtar sırası **WHEN** canonicalize **THEN** aynı JSON

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | İmza bağı | unit (`pipeline.test.ts`) | ⬜ |
| AK-1.2 | Canonical | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Döngüsel context | Redaction/canonical güvenli |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/tamper-logger/src/pipeline.ts` | İmza |

### 6.2 UC-2 — Kategori Politikaları

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: app batch/drop, audit/security fail-closed, degraded sayaçları
- hariç: sink fan-out (UC-3)

**Akış:**
1. Kategori belirlenir.
2. app → batch; audit/security → flush + anında yaz.
3. Hata audit'te çağırana yayılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | audit/security yazımı başarısızsa `log()` throw eder | AK-2.1 |
| FR-2.2 | app kategorisinde drop sayaçları health'e yansır | AK-2.2 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** sink hatası **WHEN** audit log **THEN** throw
2. **AK-2.2 — GIVEN** ring dolu **WHEN** app log **THEN** drop sayacı artar, servis ayakta

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Fail-closed | unit (`tamper-logger.test.ts`) | ⬜ |
| AK-2.2 | Drop/degraded | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| eventCode sözlükte yok | throw (K3) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/tamper-logger/src/tamper-logger.ts` | Orkestratör |

### 6.3 UC-3 — Sink Fan-Out

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: 8 sink, izolasyon, webhook imzası, alert cooldown
- hariç: SIEM servisi

**Akış:**
1. Olay tüm aktif sink'lere dağıtılır.
2. Sink hatası diğerlerini etkilemez (app kategorisinde).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Webhook istekleri HMAC imzası taşır | AK-3.1 |
| FR-3.2 | Alert hatası audit yazımını etkilemez | AK-3.2 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** webhook sink **WHEN** olay gider **THEN** `X-Signature` doğrulanabilir
2. **AK-3.2 — GIVEN** alert sink hatası **WHEN** audit log **THEN** yazım başarılı

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Webhook imza | unit (`http-webhook-sink.test.ts`) | ⬜ |
| AK-3.2 | İzolasyon | unit (`tamper-logger-alerts.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Timescale yok | Sink devre dışı |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/tamper-logger/src/sinks/**` | Sink'ler |

### 6.4 UC-4 — Zincir Doğrulama + verify-log

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: verifyChain, ihlal türleri, restart segmenti, CLI çıkış kodları
- hariç: canlı SIEM

**Akış:**
1. Log dosyası sırayla doğrulanır.
2. GENESIS_HASH yeni segment sayılır.
3. CLI 0/1/2 döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Silinmiş/yer değiştirmiş olay tespit edilir | AK-4.1 |
| FR-4.2 | Restart segmenti tamper sayılmaz | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** aradan olay silinmiş **WHEN** verifyChain **THEN** `missing_event`
2. **AK-4.2 — GIVEN** yeni segment GENESIS ile başlar **WHEN** doğrulanır **THEN** geçerli

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | İhlal tespiti | unit (`verify-chain.test.ts`) | ⬜ |
| AK-4.2 | Segment | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: UC-4 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Yanlış anahtar | `signature_mismatch` |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/tamper-logger/src/verify-chain.ts` | Doğrulama |
| `tools/verify-log.mjs` | CLI |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Audit sink hatası | Throw |
| App drop | Sayaç + degraded |
| Zincir ihlali | verifyChain raporu |
| Restart | GENESIS segment |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | İmza/zincir testli (güvenlik kritik) | komut |
| SC-2 | Fail-closed kanıtlı | komut |
| SC-3 | verify-log NIS-2 kanıtı | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 14 test dosyası / 104 test |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-4 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `TAMPER-LOGGER-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | smtp/sms sink'lerinin canlı doğrulaması (B2) | İleri İş |
| A2 | SIEM servisi (MINI-SIEM-PLANI) | İleri İş (ayrı SPEC) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. SIEM servisi.
2. Sink canlı doğrulamaları.

## 12. T Görev Özeti

| T-1 | UC-1 (imza zinciri) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (kategori) kanıt testlerinin eşleştirilmesi |
| T-3 | UC-3 (sink) kanıt testlerinin eşleştirilmesi |
| T-4 | UC-4 (doğrulama) kanıt testlerinin eşleştirilmesi |
