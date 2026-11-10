---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, plugins, epias]
review_date: 2026-11-10
---

# Plugins — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [PLUGINS-MIMARISI.md](./PLUGINS-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama kapanışı — `packages/plugins` bu turda değişmedi; kanıt: mevcut 9 test + kod incelemesi.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/plugins/epias-market-prices/src/plugin.ts#EpiasMarketPricesPlugin` | (doğrulama) `IIntegrationPlugin` uygular; manifest + `schedule()` interval; `fetch → MarketDataPoint[]` | K2–K5 |
| 2 | `plugin.ts` import yüzeyi | (doğrulama) importlar yalnız `@gd-monorepo/plugin-sdk`, `@gd-monorepo/epias-client`, `@gd-monorepo/shared-types` — `pg`/SQL/HTTP-auth YOK; `EpiasTicketStore` enjekte | K1/K5/Purity 1 |
| 3 | `plugin.ts#CURSOR_KEY` | (doğrulama) cursor anahtarı `lastFetchTo`; penceresiz fetch cursor'dan; ilk çalışmada son 24 saat | K3/FR-1.1 |
| 4 | `plugin.ts` (hourField eşleme) | (doğrulama) `hourField` varsa timestamp = date + (hour−1) saat (TR); geçersiz/eksiz saat satırı ATLANIR | K2/FR-1.2 |
| 5 | `plugin.ts#activate` | (doğrulama) config doğrulaması throw eder (seri tanımı/hourField tipi) → host atlar; "servis devam eder" host yarısı `INTEGRATION-SERVICE`/`PLUGIN-SDK` loader kapsamı | K4/FR-1.3 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | glob + grep `plugin.test.ts` | **9 test / 1 dosya** — SPEC "mevcut 9 test" iddiası DOĞRULANDI |
| Yaşam döngüsü | #1 (manifest+schedule), #9 (activate öncesi fetch → throw) | |
| Fetch/cursor | #2 (satır→MarketDataPoint + TGT header + cursor yazımı), #5 (penceresiz → cursor'dan) | |
| hourField | #3 (date+(hour−1), TR), #4 (geçersiz saat → satır atlanır) | |
| K1/auth | #6 (iki fetch aynı TGT — CAS'e tek istek) | |
| K4/config | #7 (geçersiz config → activate fırlatır) | |
| K2/satır | #8 (bozuk satırlar sessiz atlanır) | |
| Taze test koşusu | `nx run epias-market-prices:test` | **İLETİLMEDİ** — reviewer salt-okuma (B.2/G1) |
| Mutasyon | `bun run test:mutation` | **verisi yok** — değişen dosya yok |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Cursor: pencere yoksa `lastFetchTo`'dan; ilk çalışmada son 24 saat | #2 + #5 — envanter | 🟡 |
| AK-1.2 | `hourField` timestamp kaydırması | #3 + #4 — envanter | 🟡 |
| AK-1.3 | Geçersiz config → plugin atlanır, servis devam | #7 (plugin tarafı); host devamlılığı INTEGRATION-SERVICE turunda kanıtlanacak | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | AK-1.3 kanıtı yarıda (yarı-test) | Birim test yalnız plugin throw'unu sabitler; "servis çalışır" iddiası host loader'a ait — kapanış orada (INTEGRATION-SERVICE) tamamlanır; bu KAPANIŞ referans verir, kopyalamaz (SERVICES Purity 2) |
| S2 | B1: tek örnek plugin | Değişiklik yok; katalog A1 İleri İş — YAGNI, talep bekliyor |

### A.5 Gözle Kontrol Maddeleri

- [x] Plugin auth bilmez — TGT `EpiasClient`'ta, store enjekte (K1)
- [x] Plugin DB bilmez — dönüş `MarketDataPoint[]`, yazım `ExternalSeriesWriter`'da (K5)
- [x] Geçersiz satır sessiz atlanır; plugin çökmez (Purity 2)
- [x] Config hatası `activate`'te throw (Purity 3)

### A.6 Genel Durum Özeti

**MODÜL UYGUN:** 3/3 AK mevcut 9 testle örtüşüyor; tek not AK-1.3'ün host yarısının INTEGRATION-SERVICE kapanışına devri (S1). İlişkili EPIAS-CLIENT (TGT/CAS) ve INTEGRATION-SERVICE (host) kapanışlarıyla çapraz referans kuralları işliyor. **NIS-2:** dış veri toplama plugin'i — kimlik/credential yüzeyi EPIAS-CLIENT SPEC'inde; burada auth YOK (K1) → uyumluluk boşluğu bu modül için tanımsız ve yerinde. Mutasyon: uygulanmaz (değişiklik yok).

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| manifest/schedule | `activate` sonrası | interval 1 saat bildirimi | `plugin.test.ts` #1 |
| fetch eşleme | satırlar | `MarketDataPoint[]` + TGT header + cursor | #2 |
| hourField=3 | satır eşlenir | ts = date + 2h (TR) | #3 |
| hourField bozuk | satır | atlanır | #4 |
| penceresiz fetch | cursor var | cursor'dan başlar | #5 |
| iki fetch | aynı TGT | CAS'e tek istek | #6 |
| geçersiz config | `activate` | throw (plugin atlanır) | #7 |
| bozuk satır | fetch | sessiz atlanır, çökme yok | #8 |
| activate öncesi fetch | sıralama ihlali | throw | #9 |
| host devamlılığı (S1) | plugin throw | servis ayağa kalkmaya devam | **KAPSANMAYAN burada** (G2) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze test koşusu iletilmedi (9 test envanterde) | Düşük | Ana agent `nx run epias-market-prices:test` |
| G2 | AK-1.3 host yarısı (loader atlar + servis sürer) | Düşük — ayrı modülün konusu | INTEGRATION-SERVICE / PLUGIN-SDK KAPANIŞ'ları |
| G3 | "ilk çalışmada son 24 saat" ayrı testle sabit değil | Düşük — #5 cursor'u sabitler | #5'e tek assertion eklemek yeterli |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 9 test eşleşmesi doğrulandı; AK-1.3 host yarısı INTEGRATION-SERVICE'e devir notu | (yok — SPEC değişmedi) |
