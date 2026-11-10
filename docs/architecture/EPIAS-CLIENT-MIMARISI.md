---
status: active
space: architecture
tags: [mimari, epias, tgt, guvenlik, spec]
review_date: 2026-11-10
---

# EPİAŞ Client — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `PACKAGES-MIMARISI.md` (indeks), `PLUGIN-SDK-MIMARISI.md` (HttpClient), `PLUGINS-MIMARISI.md` (tüketici plugin).

## 1. Amaç ve Bağlam

`packages/epias-client` paketinin sözleşmesi: EPİAŞ CAS kimlik doğrulaması + TGT yaşam döngüsü + tipli HTTP istemcisi. Güvenlik-kritik: kimlik bilgisi taşıma, throttle koruması, dosya izinleri. Tüm EPİAŞ plugin'leri aynı bilet önbelleğini paylaşır.

| Katman | Kapsam |
|:-------|:-------|
| Dahil | TGT üretimi/yenileme/invalidate, dosya kalıcılığı, 401 tek-retry, tarih dönüşümü, endpoint tablosu |
| Hariç | Plugin seri eşlemesi (PLUGINS), HTTP transport (PLUGIN-SDK) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | TGT yaşam döngüsü TEK noktada: bilet dosyada (`{users:{<user>:{ticket,expiresAt}}}`), TTL 2 saat, `renewBefore` 5 dk; süresi dolmadan yeniden kullanılır | Tüm plugin'ler aynı store örneğini paylaşır — her plugin'in ayrı TGT üretip throttle'a takılması engellenir |
| K2 | Eşzamanlı çift üretim engeli: kullanıcı başına `inFlight` promise haritası → eşzamanlı isteklerde TEK CAS çağrısı | Throttle koruması |
| K3 | Atomik yazım: `tmp` + `rename`; dizin `recursive` oluşturulur | Yarım dosya yok |
| K4 | CAS sözleşmesi: yalnız HTTP **201** kabul; yanıt HTML'dir → TGT `TGT-[A-Za-z0-9._-]+` regex'iyle ayıklanır; bulunamazsa hata (cache'e girmez); WAF tarayıcı-benzeri UA ister (`Mozilla/5.0` zorunlu) | Kırılgan dış servis sözleşmesi sabitlendi |
| K5 | 401 → bilet geçersiz kıl + BİR KEZ tekrar dene; diğer hatalar aynen fırlar | Sessiz döngü yok |
| K6 | Zaman dilimi: `toEpiasIso` sabit **+03:00** (TR'de DST yok); gelen verinin kendi offset'i korunur | Eski DST'li dönem bozulmaz |
| K7 | Katmanlaşma: `plugin-sdk/HttpClient` (domain-agnostic) → `EpiasClient` (TGT header + 401 + tipli yardımcılar) → plugin (yalnız seri eşleme, auth BİLMEZ) | Auth tek katmanda |
| K8 | Elegant Object istisnası (belgelenmiş): `EpiasTicketStore#ticket` sorgu adı taşır ama önbellek yoksa CAS'ten alıp dosyaya yazar | Bilet yaşam döngüsünün tek noktada tutulması bu yan etkiyi zorunlu kılar |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Endpoint sabitlerinin büyük kısmı henüz tüketicisiz (dashboard/vep/orderSummary...) — tipli yüzey ilk faz veri setiyle sınırlı | `packages/epias-client/src/endpoints.ts` |
| B2 | Örnek plugin config'inde düz metin kullanıcı/şifre commit'li | `services/integration-service/config/plugins/epias-market-prices.json` — T-18 ile düzeltilecek |

## 4. Mimari

```text
Plugin (epias-market-prices) ──► EpiasClient ──► HttpClient (plugin-sdk)
                                     │
                                     └──► EpiasTicketStore (dosya, TTL 2h, inFlight)
```

### 4.1 Sözleşmeler

| Sembol | Rol |
|:-------|:----|
| `packages/epias-client/src/client.ts#EpiasClient` | İstemci |
| `packages/epias-client/src/client.ts#EpiasClientConfig` | Config |
| `packages/epias-client/src/ticket-store.ts#EpiasTicketStore` | TGT önbelleği |
| `packages/epias-client/src/endpoints.ts#EPIAS_ENDPOINTS` | Endpoint tablosu |
| `packages/epias-client/src/date.ts#toEpiasIso` | Tarih dönüşümü |

## 5. Purity Kuralları (ZORUNLU)

1. Auth yalnız `EpiasClient`'ta; plugin TGT bilmez (K7).
2. Bilet düz metni loglanmaz; yalnız hash/expiry raporlanır.
3. TGT üretimi tek store üzerinden (K1/K2).
4. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — TGT Yaşam Döngüsü

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: bilet alma, yenileme, invalidate, dosya kalıcılığı, eşzamanlı tek CAS
- hariç: endpoint veri eşlemesi (PLUGINS)

**Akış:**
1. Geçerli bilet varsa dosyadan okunur.
2. Yoksa/expired ise CAS çağrısı yapılır; TGT ayıklanır.
3. Dosyaya atomik yazılır; 401'de invalidate + tek retry.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Geçerli bilet yeniden kullanılır (CAS çağrısı yapılmaz) | AK-1.1 |
| FR-1.2 | Eşzamanlı istekler tek CAS çağrısı üretir | AK-1.2 |
| FR-1.3 | 401 sonrası bilet invalidate edilir ve bir kez yeniden denenir | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** süresi dolmamış bilet **WHEN** istek yapılır **THEN** CAS'e gidilmez
2. **AK-1.2 — GIVEN** iki eşzamanlı istek **WHEN** bilet yok **THEN** tek CAS çağrısı yapılır
3. **AK-1.3 — GIVEN** 401 yanıtı **WHEN** istek tekrarlanır **THEN** yeni biletle bir kez denenir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Bilet yeniden kullanımı | unit (`ticket-store.test.ts`) | ⬜ |
| AK-1.2 | inFlight | unit | ⬜ |
| AK-1.3 | 401 retry | unit (`client.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-1: UC-1 kanıt testlerini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| 201 dışı yanıt | Hata; cache'e yazılmaz |
| HTML'de TGT yok | Hata |
| Dosya izni | 0600 |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/epias-client/src/ticket-store.ts` | Store |
| `packages/epias-client/src/client.ts` | İstemci |

### 6.2 UC-2 — Tipli HTTP + Envelope

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: TGT header enjeksiyonu, envelope tipleri, satır tipleri
- hariç: veri normalizasyonu (PLUGINS)

**Akış:**
1. TGT header'ı eklenir.
2. İstek gönderilir; envelope tipli döner.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Her istek TGT header'ı taşır | AK-2.1 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** geçerli bilet **WHEN** istek yapılır **THEN** `TGT` header'ı gönderilir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Header | unit (`client.test.ts`) | ⬜ |

**T Görev Listesi:**
- [ ] T-2: UC-2 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Tüketicisiz endpoint (B1) | Tabloda kalır, kullanılmaz |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/epias-client/src/endpoints.ts` | Endpoint tablosu |

### 6.3 UC-3 — Zaman Dönüşümü

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `toEpiasIso` (+03:00), gelen offset korunması
- hariç: plugin `hourField` mantığı (PLUGINS)

**Akış:**
1. Tarih `+03:00` formatına çevrilir.
2. Gelen veride offset varsa korunur.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Giden tarihler sabit +03:00 taşır | AK-3.1 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** herhangi bir tarih **WHEN** `toEpiasIso` çağrılır **THEN** sonuç `+03:00` ile biter

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Offset | unit (`date`) | ⬜ |

**T Görev Listesi:**
- [ ] T-3: UC-3 kanıt testini eşleştir

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| DST'li eski veri | Kendi offset'i korunur |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `packages/epias-client/src/date.ts` | Dönüşüm |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Bilet expired | Yeniden alınır |
| 401 | Invalidate + tek retry |
| CAS hatası | Hata (cache'e yazılmaz) |
| Eşzamanlı istek | Tek CAS |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | TGT akışı testli (güvenlik kritik) | komut |
| SC-2 | Bilet loglanmaz | kod inceleme |
| SC-3 | Tek store paylaşımı | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — mevcut 15 test kanıt |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-3 (kanıt eşleştirme) |
| 4. REVIEW (GLM-5.3) | `EPIAS-CLIENT-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Tüketicisiz endpoint'lerin temizliği (B1) | İleri İş (talep doğunca) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Endpoint yüzeyinin ilk faz veri setiyle sınırlandırılması (A1).
2. Bilet store için ayrı SPEC (ihtiyaç doğarsa).

## 12. T Görev Özeti

| T-1 | UC-1 (TGT yaşam döngüsü) kanıt testlerinin eşleştirilmesi |
| T-2 | UC-2 (tipli HTTP) kanıt testinin eşleştirilmesi |
| T-3 | UC-3 (zaman dönüşümü) kanıt testinin eşleştirilmesi |
