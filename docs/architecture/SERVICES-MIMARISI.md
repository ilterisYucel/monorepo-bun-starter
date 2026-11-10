---
status: active
space: architecture
tags: [mimari, indeks, services, spec]
review_date: 2026-11-10
---

# SERVICES — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `DOKUMAN-YAPISI-MIMARISI.md` (reorg ana SPEC'i), `PACKAGES-MIMARISI.md`, `docs/architecture/SPEC-SABLONU.md`.

## 1. Amaç ve Bağlam

`services/` altındaki 5 servisin ve servisler arası çalışan 3 çapraz iş biriminin haritası. Her servis kendi SPEC'ini alır (K8); çapraz birimler ayrı SPEC'lerdir (K7). Bu indeks yalnız harita + durum taşır.

| Katman | Kapsam |
|:-------|:-------|
| dahil | 5 servis + 3 çapraz birim haritası, SPEC linkleri, durum takibi |
| hariç | Servis içi kararlar (kendi SPEC'lerinde), deployment yapısı (`DEPLOYMENT-MIMARISI.md`) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Her servis için 1 SPEC + 1 KAPANIŞ | Bu indeksin satırları o dosyalara bağlanır |
| K2 | Çapraz iş birimleri (AUTH, KOMUT-MANEVRA-OPERASYON, TELEMETRI-ZINCIRI) servis SPEC'lerinden bağımsız kendi SPEC'lerini alır | Sahiplik çakışması yok — bölüm bazında referans |
| K3 | Kural motoru `MANAGEMENT-SERVICE-MIMARISI.md` bölümüdür; ayrı SPEC açılmaz | Mevcut `KURAL-MOTORU-V2` içeriği oraya damıtılır |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Servis kararları onlarca eski dokümana dağılmış (management-service tek başına 6 dosya) | `docs/architecture/` envanteri (2026-11-10) |
| B2 | Doküman↔kod çelişkileri: olay whitelist drift'i, guest oturum kuralı | `DOKUMAN-YAPISI-MIMARISI.md` B3 |

## 4. Mimari

### 4.1 Servis haritası

| Dizin | Sorumluluk (tek satır) | Birim SPEC | Durum |
|:------|:-----------------------|:-----------|:------|
| `services/web-service` | HTTP API (hexagonal), tier'lar (container/site/boss), telemetri sorgu, komut/manevra yüzeyleri, realtime WS | `WEB-SERVICE-MIMARISI.md` | ✅ yazıldı |
| `services/device-service` | Cihaz polling, alarm üretimi, telemetri yazma indirgeme, heartbeat, debug injector | `DEVICE-SERVICE-MIMARISI.md` | ✅ yazıldı |
| `services/data-service` | BullMQ → Timescale telemetri yazıcı | `DATA-SERVICE-MIMARISI.md` | ✅ yazıldı |
| `services/management-service` | Kural motoru (değerlendirme + aksiyon kanalları + katalog) | `MANAGEMENT-SERVICE-MIMARISI.md` | ✅ yazıldı |
| `services/integration-service` | Plugin host + dış seri depolama | `INTEGRATION-SERVICE-MIMARISI.md` | ✅ yazıldı |

### 4.2 Çapraz iş birimleri

| Birim | Kapsam | SPEC | Durum |
|:------|:-------|:-----|:------|
| AUTH | token/refresh/MFA/throttle/rbac/ws-token/agent oturum | `AUTH-MIMARISI.md` | ✅ yazıldı |
| KOMUT-MANEVRA-OPERASYON | çözümleme + kayıt + yürütücü + uzak kanal + web yüzeyleri + deployment katalogları | `KOMUT-MANEVRA-OPERASYON-MIMARISI.md` | ✅ yazıldı |
| TELEMETRI-ZINCIRI | cihaz config + tagger/canonical + deadband + sorgu katmanı + konteyner görünümü + alarm | `TELEMETRI-ZINCIRI-MIMARISI.md` | ✅ yazıldı |

## 5. Purity Kuralları (ZORUNLU)

1. İndeks derinlik taşımaz — servis kararı kendi SPEC'indedir.
2. Çapraz SPEC'ler servis SPEC'lerini kopyalamaz; bölüm bazında referans verir.
3. Her satırın SPEC linki ve durumu zorunludur.

## 6. Use Case'ler

### 6.1 UC-1 — Servis İndeksinin Bakımı

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: servis + çapraz birim haritası, linkler, durum kolonu
- hariç: birim SPEC içerikleri

**Akış:**
1. Servis/birim eklendi-silindi → indeks güncellenir.
2. Durum değişti → kolon güncellenir.
3. `bun run spec:check` temiz.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Her servis ve çapraz birim tek satırla temsil edilir; sorumluluk + SPEC yolu + durum taşır | AK-1.1 |
| FR-1.2 | Servis SPEC'leri çapraz birimlere bölüm bazında referans verir; kopya içerik taşımaz | AK-1.2 |
| FR-1.3 | İndeks `bun run spec:check` lint'inden 0 hata ile geçer | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** `services/` dizin listesi **WHEN** indeks okunur **THEN** her servis ve çapraz birim için tam bir satır vardır
2. **AK-1.2 — GIVEN** birim SPEC'leri yazılmış **WHEN** içerik karşılaştırılır **THEN** aynı karar iki SPEC'te kopya olarak bulunmaz
3. **AK-1.3 — GIVEN** indeks dosyası **WHEN** spec:check koşulur **THEN** hata sayısı 0'dır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Dizin↔satır tam eşleşme | gözle | ⬜ |
| AK-1.2 | Kopya karar yok, referans var | kod inceleme | ⬜ |
| AK-1.3 | spec:check çıkış kodu 0 | komut | ⬜ |

**T Görev Listesi:**
- [ ] T-1: İndeksin yazımı ve servis listesinin kodla eşleştirilmesi

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Birim SPEC henüz yok | Satır `yazılacak` durumunda kalır |
| Çapraz birim servis sınırını değiştirir | İki SPEC'te referans satırı güncellenir |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `docs/architecture/SERVICES-MIMARISI.md` | Bu indeks |
| `services/*/` | Haritalanan servisler |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Yeni servis | Satır + birim SPEC görevi eklenir |
| Birim SPEC onaylandı | Durum `✅ Approved` |
| Birim KAPANIŞ tamamlandı | Durum `🟢 Doğrulanmış` |
| Sahiplik çakışması | Karar tek SPEC'te kalır, diğeri referans verir |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | 5 servis + 3 çapraz birim indekste temsil edilir | gözle |
| SC-2 | İndeks spec:check 0 hata | komut |
| SC-3 | Kopya karar yok (tek sahip) | kod inceleme |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — yeni davranış kodu yok |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1; mutasyon kapısı değişen üretim `.ts` yoksa atlanır |
| 4. REVIEW (GLM-5.3) | `SERVICES-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Servis bağımlılık grafiğinin indekse eklenmesi | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Servisler arası veri akış diyagramının (telemetri, komut, olay) indekse eklenmesi.
2. İndeksten otomatik bağlantı doğrulama tool'u.

## 12. T Görev Özeti

| T-1 | `SERVICES-MIMARISI.md` indeksinin yazımı ve servis listesinin kodla eşleştirilmesi |
