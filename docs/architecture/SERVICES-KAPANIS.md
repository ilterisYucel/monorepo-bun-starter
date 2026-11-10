---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, services, indeks]
review_date: 2026-11-10
---

# Services — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [SERVICES-MIMARISI.md](./SERVICES-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** İndeks doğrulama kapanışı — kod yüzeyi yok; kanıtlar dizin eşleştirme + referans taraması + `spec:check` koşusu.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `docs/architecture/SERVICES-MIMARISI.md#4.1` | (doğrulama) 5 servis satrı ↔ `services/` dizin listesi birebir (`web-service, device-service, data-service, management-service, integration-service` — diskte 5/5, fazlası yok) | K1/FR-1.1 |
| 2 | `docs/architecture/SERVICES-MIMARISI.md#4.2` | (doğrulama) 3 çapraz birim (AUTH, KOMUT-MANEVRA-OPERASYON, TELEMETRI-ZINCIRI) satır + SPEC hedefleri mevcut | K2/FR-1.1 |
| 3 | Servis SPEC ↔ çapraz SPEC referansları | (doğrulama) WEB-SERVICE/DEVICE-SERVICE/DATA-SERVICE/MANAGEMENT-SERVICE İlişkili satırlarında çapraz SPEC referansı var; kopya bölüm tespit edilmedi | K2/FR-1.2 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| İndeks lint'i | `bun run spec:check docs/architecture/SERVICES-MIMARISI.md docs/architecture/PACKAGES-MIMARISI.md` | **0 hata, 0 uyarı** — reviewer koştu |
| Servis SPEC linkleri | dosya varlık kontrolü (glob) | §4.1 + §4.2 hedefleri mevcut ✓ |
| Referans taraması | grep: çapraz SPEC adları servis SPEC'lerinde | 4/5 servis referans veriyor; INTEGRATION-SERVICE çapraz birim kapsamı dışı — tutarlı |
| Kanıt çiftliği gözlemi | grep: `rbac.test.ts` | WEB-SERVICE AK-1.1 ve AUTH AK-4.1 AYNI testi kanıt gösteriyor — sahiplik AUTH'ta kalıyor (S1 notu) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Dizin↔satır tam eşleşme | A.1 #1–#2 (5+3/5+3) | 🟢 |
| AK-1.2 | Kopya karar yok, referans var | A.2 referans taraması; rbac kanıt-çiftliği gözlemi (S1) — karar metni kopyası yok | 🟢 |
| AK-1.3 | spec:check çıkış kodu 0 | A.2 koşusu | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | rbac test kanıtı iki SPEC AK'sında ortak | `WEB-SERVICE-MIMARISI.md` AK-1.1 ile `AUTH-MIMARISI.md` AK-4.1 aynı `rbac.test.ts` dosyasını kanıt gösterir; KARAR sahipliği AUTH'ta olduğundan içerik kopyası yok — indeks düzeyinde "tek kanıt, tek birim" notu önerilir, karar developer |
| S2 | `DOKUMAN-YAPISI-MIMARISI.md` referansı kırık | İlişkili + B1 satırları diskte olmayan dosyaya işaret (PACKAGES S2 ile aynı kök) |

### A.5 Gözle Kontrol Maddeleri

- [x] İndeks derinlik taşımıyor — servis kararları birim SPEC'lerde (Purity 1)
- [x] Çapraz SPEC'ler servis bölümünü kopyalamıyor; referans veriyor (Purity 2)
- [x] K3: kural motoru MANAGEMENT-SERVICE bölümü — ayrı KURAL-MOTORU-V2 `deprecated/`'e taşındı ✓

### A.6 Genel Durum Özeti

**İNDEKS UYGUN:** 3/3 AK 🟢; tek gözlem S1 (kanıt çiftliği) + S2 (ölü link — PACKAGES ile ortak kök). NIS-2: indeks belgesi — güvenlik yüzeyi yok. Mutasyon: değişen üretim kodu yok — uygulanmaz. Servis birimlerinin kendi kapanışları (WEB-SERVICE, DEVICE-SERVICE, DATA-SERVICE, MANAGEMENT-SERVICE, INTEGRATION-SERVICE) ayrı turlarda; AUTH/KOMUT/TELEMETRI çapraz kapanışları tur 4'te.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → kanıt ref'i)

| Durum | Koşul | Beklenen (THEN) | Kanıt ref'i |
|:------|:------|:----------------|:------------|
| Dizin listesi | §4.1 okunur | 5 servis = 5 satır | A.1 #1 |
| Çapraz birimler | §4.2 okunur | 3 birim = 3 satır + linkler mevcut | A.1 #2 |
| Referans bütünlüğü | servis SPEC'leri taranır | kopya yok, referans var | A.2 |
| Lint | spec:check | 0 hata | A.2 |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Kanıt-çiftliği denetimi araçsallaşmamış (S1 elle grep) | Düşük | spec:check'e "aynı test ≥2 SPEC'te kanıt" uyarısı eklenebilir (A1 kapsamı dışı) |
| G2 | Servis bağımlılık grafiği indekste yok (A1) | Düşük | SPEC İleri İş #1 — YAGNI |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: indeks↔dizin + referans doğrulaması | (yok — SPEC değişmedi) |
