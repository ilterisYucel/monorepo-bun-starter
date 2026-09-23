---
status: active
space: architecture
tags: [sablon, spec, kapanis, is-akisi, dokumantasyon, standart]
review_date: 2026-09-23
---

# SPEC Şablonu — Kanonik Dokümantasyon Formatı

> **Amaç:** AGENTS.md "Geliştirme İş Akışı" sürecinde üretilen tüm `<MODUL>-MIMARISI.md` (SPEC) ve `<MODUL>-KAPANIS.md` (Doğrulama + Test Kapsamı) dokümanları için TEK, sabit, uzun vadeli format.
> **Statü:** Yeni SPEC/KAPANIŞ dokümanları ve revize edilenler bu şablonu kullanır. Eski dokümanlar geriye dönük dönüştürülmez (AGENTS kuralı: geriye dönük zorunluluk yok).
> **Kaynak kararlar:** 2026-09-23 — UC-şablonu + repo SPEC geleneği birleşimi; aynı tarihte DOGRULAMA+TEST-KAPSAMI tek `<MODUL>-KAPANIS.md`'de birleştirildi (2 doküman/modül), GWT kabul senaryoları + FR/SC numaralama eklendi (GitHub Spec Kit hizası), kod referansı satır numarasından sembol çapasına geçti.

---

## Formatın iki katmanı

| Katman | İçerik | Kaynağı |
|:-------|:-------|:--------|
| **Doküman seviyesi** | Metadata, amaç, kararlar, gereksinimler (FR/SC), mimari, purity, yaşam döngüsü, aşama eşlemesi, açık kararlar | Repo SPEC geleneği |
| **Use-case seviyesi** | Durum, kapsam, akış, gereksinimler, GWT kabul senaryoları, kabul kriterleri, görevler, edge cases, involved files | UC şablonu + Spec Kit GWT hizası |

---

## BÖLÜM 1 — SPEC Şablonu (`<MODUL>-MIMARISI.md`)

```markdown
---
status: active
space: architecture
tags: [mimari, <alan>, spec]
review_date: YYYY-MM-DD
---

# <MODUL> — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** [<bağlantılı SPEC/standart>](<yol>)

## 1. Amaç ve Bağlam
<problem, çözüm yönü, kapsam tablosu (hangi katman dahil/hariç)>

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)
| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | <karar> | <bu SPEC'teki somut sonucu> |

## 3. Mevcut Durum / Kök Nedenler   ← yalnızca revizyon/analiz SPEC'lerinde
| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | <bulgu> | `<dosya>#<sembol>` @<commit-short> |

## 4. Mimari
<diyagram(lar) — her mod bir ayrı ### alt başlık>

## 5. Purity Kuralları (ZORUNLU)
1. <katman/yasak kuralı> ...

## 6. Use Case'ler
<her use-case aşağıdaki blok — §UC Şablonu>

## 7. Yaşam Döngüsü ve Hata Kategorileri
| Durum | Davranış |
|:------|:---------|
<JSDoc aşamasının girdisi: state'ler, edge-case'ler, hata kategorisi, yan etkiler, limitler>

## 8. Başarı Kriterleri (SC-x)
| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | <ölçülebilir sonuç — Spec Kit Success Criteria hizası> | <metrik/kaynak> |

## 9. Aşama Eşlemesi (iş akışı)
| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | <T-x sözleşmeleri> |
| 3. TEST | <kırmızı testler> |
| 4. IMPL | <implementasyon görevleri> |
| 5. KAPANIŞ | `<MODUL>-KAPANIS.md` (Doğrulama + Test Kapsamı) |

## 10. Açık Kararlar
| # | Konu | Durum |
|:--|:-----|:------|
| A1 | <erteleme> | <hangi görevde kapanır / kapalı notu> |

## 11. İleri İş (bu pakette YAPILMAZ — referans)
1. <ayrı paket konusu + bağlantı>

## 12. T Görev Özeti
<§6'daki UC bloklarından derlenen tek liste — tüm paketin iş sırası>
```

---

### UC Şablonu (§6 içinde tekrar eden blok)

```markdown
### 6.x UC-N — <Use Case Adı>

**Status:** ✏️ Specified (onay bekliyor) · ✅ Approved · 🟡 Geliştirmede · 🟢 Doğrulanmış · ⛔ Defer

**Kapsam:**
- dahil: <bu UC'nin yaptıkları>
- hariç: <açık sınırlar — yapılmayanlar>

**Akış:**
1. <adım>
2. <adım>

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-<uc>.<n> | System MUST / SHOULD <doğrulanabilir davranış> | AK-<uc>.<n> |

**Kabul Senaryoları (GWT):**
> AK başına en az 1 senaryo — Given/When/Then formu (Spec Kit hizası).
> Bu blok test üretiminin girdisidir: entegrasyon/e2e stub'ları buradan türetilir.

1. **AK-<uc>.1 — GIVEN** <başlangıç durumu> **WHEN** <eylem> **THEN** <beklenen sonuç>
2. **AK-<uc>.2 — GIVEN** ... **WHEN** ... **THEN** ...

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-<uc>.1 | <testle doğrulanabilir cümle> | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-x: <görev>

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
```

---

## BÖLÜM 2 — KAPANIŞ Şablonu (`<MODUL>-KAPANIS.md`)

> Doğrulama (eski DOGRULAMA) + Test Kapsamı (eski TEST-KAPSAMI) **tek dokümanda** — 2 doküman/modül.

```markdown
---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, <alan>]
review_date: YYYY-MM-DD
---

# <MODUL> — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [<MODUL>-MIMARISI.md](./<MODUL>-MIMARISI.md) (onaylı — AK/FR/SC kaynağı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi
| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `<dosya>#<sembol>` @<commit-short> | <değişiklik> | <K-x/FR-x/B-x> |

### A.2 Test Kanıtları
| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| <proje> | <komut> | <N/N yeşil> |

### A.3 Kabul Kriteri Kanıtları
| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-x.y | <SPEC'ten kısa özet — kopya DEĞİL, işaretçi> | <test adı veya `dosya#sembol`> | 🟢/🟡/⬜ |

### A.4 Sapmalar
| # | Sapma | Açıklama |
|:--|:------|:---------|

### A.5 Gözle Kontrol Maddeleri
- [x] <purity/manuel kontrol maddesi>

### A.6 Genel Durum Özeti
<tek paragraf + review_date>

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)
| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| <SPEC §7 yaşam döngüsü satırı> | <koşul> | <beklenen> | `<test adı>` (`dosya#sembol`) |

### B.2 KAPSANMAYAN Boşluklar
| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | <kapsanmayan dal> | <düşük/orta/yüksek> | <plan> |

**review_date:** YYYY-MM-DD
```

---

## Kurallar

1. **ID şeması global ve benzersizdir:** `K-x` (kararlar), `B-x` (bulgular), `FR-x` (gereksinimler), `SC-x` (başarı kriterleri), `AK-x` (kabul kriterleri), `T-x` (görevler), `A-x` (açık kararlar), `UC-x` (use-case). Aynı doküman içinde çakışan numara YOKTUR; AK ve FR kodları UC numarasını taşır (örn. UC-2'nin kriteri `AK-2.1`, gereksinimi `FR-2.1`).
2. **GWT zorunludur:** Her AK için en az 1 Given/When/Then senaryosu yazılır — test üretilebilirliğin ön koşuludur (Spec Kit hizası; "test otomasyonu" girdisi). Kriter cümlesi tek başına YETERLİ DEĞİLDİR.
3. **Kanıt sütunu zorunludur:** `unit` | `e2e` | `gözle` | `coverage` | `kod inceleme`. "Testle doğrulanabilir" tek başına YETERLİ DEĞİLDİR — nasıl kanıtlanacağı yazılır.
4. **Kod referansı SEMBOL çapasıdır — satır numarası YASAKTIR:** `path/file.ts#fonksiyonAdı` (edit sonrası bayatlamaz; insan sembolü arayarak, LLM grep ile bulur). Denetim sabitlemesi için opsiyonel `@<git-short-hash>` eklenir. İstisna: `@ file:line` yalnızca aynı PR içindeki geçici analiz notlarında.
5. **Durum kolonu yaşar:** SPEC onayıyla `✅ Approved`, KAPANIŞ tamamlanınca `🟢 Doğrulanmış` — doküman iş hattının güncel fotoğrafıdır (gate takibi dokümanın kendisinde).
6. **Status tanımları:** `✏️ Specified` = SPEC yazıldı, developer onayı bekleniyor (AGENTS onay kapısı); `✅ Approved` = onaylandı (tarihle); `🟡 Geliştirmede` = test/impl sürüyor; `🟢 Doğrulanmış` = KAPANIŞ tamam; `⛔ Defer` = açık kararla ertelendi (A-x referansıyla).
7. **Kapsam "hariç" satırı zorunludur** — ne yapılmayacağı açık yazılmadan SPEC tamam sayılmaz.
8. **Involved Files tablosu zorunludur** — review'da değişiklik yüzeyi ilk bakışta görülür; KAPANIŞ'ın A.1 matrisi bu tablodan türetilir.
9. **2 doküman/modül:** SPEC (`-MIMARISI.md`) + KAPANIŞ (`-KAPANIS.md`). Ayrı DOGRULAMA/TEST-KAPSAMI dokümanı AÇILMAZ. KAPANIŞ'ın A.3 tablosu SPEC AK tablosunun KOPYASI değildir — özet + kanıt işaretçisidir; kanonik AK tanımı SPEC'te yaşar.
10. **Test envanteri otomatiktir:** `docs/roadmap/test-envanteri.md`'nin it-by-it envanter bölümleri `bun run test:inventory` ile test dosyalarından üretilir — elle kopya YAPILMAZ. Boşluk notları (KAPSANMAYAN) KAPANIŞ §B.2'de yaşar; envanterde yalnızca indeks/link.
11. **Lint kapısı:** Kapanıştan önce `bun run spec:check <dosya>` temiz olmalıdır (zorunlu bölümler, ID benzersizliği, AK↔T↔FR eşleşmesi, status enum'u, GWT varlığı, satır-referans yasağı).
12. **Eski dokümanlar dönüştürülmez** — yalnızca yeni/revize SPEC'ler bu şablonu kullanır (AGENTS: geriye dönük zorunluluk yok). Eski `<MODUL>-DOGRULAMA.md`/`-TEST-KAPSAMI.md` dosyaları legacy olarak kalır; dokunulduğunda `-KAPANIS.md`'ye taşınır.

---

## Şema → İş Akışı Eşlemesi (SDD hizası)

| SDD şema adımı | Bu repodaki karşılık |
|:---|:---|
| 1. SPEC (sınırlar çizilir) | `<MODUL>-MIMARISI.md` + developer onay kapısı |
| 2. Plan ve görevler | SPEC §12 T görev özeti + UC T listeleri |
| 3. Test otomasyonu | GWT senaryoları (bu şablon §UC) — entegrasyon/e2e stub girdisi |
| 4. Mikro TDD döngüsü | Aşama 3 TEST (KIRMIZI) → Aşama 4 IMPL (YEŞİL) |
| 5. Doğrulama | `<MODUL>-KAPANIS.md` §A (orijinal SPEC'e karşı kanıt) |

> OpenAPI/API kontrat dokümantasyonu bu repoda KULLANILMAZ (2026-09-23 kararı — iş ağırlıklı endpoint üretimi değil; sistem sınırları SPEC + tip sözleşmeleriyle çizilir).
