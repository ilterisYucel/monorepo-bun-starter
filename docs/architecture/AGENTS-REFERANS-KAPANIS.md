---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, agents, referans, dokumantasyon]
review_date: 2026-12-01
---

# AGENTS Referans Sistemi — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [AGENTS-REFERANS-MIMARISI.md](AGENTS-REFERANS-MIMARISI.md) (onaylı — ✅ 2026-10-01, REV.01; **REV.02 ✅ 2026-10-05 — yönlendirme tablosu**; AK/FR/SC kaynağı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `AGENTS-WS-TUNNEL.md` | Yeni: TunnelConnector + Tünel sözleşmeleri | K-2, FR-1.1 |
| 2 | `AGENTS-DEVICE-SERVICE.md` | Yeni: device transport strategy + alarm özeti | K-2, FR-1.2 |
| 3 | `AGENTS-KOMUT-MANEVRA.md` | Yeni: komut config + güncel manevra/operasyon | K-5, FR-1.3, FR-1.4 |
| 4 | `AGENTS-DEVICE-CONFIG.md` | Yeni: telemetry tagging + canonical | K-3, FR-2.1 |
| 5 | `AGENTS-INTEGRATION.md` | Silindi (içerik 1+2'ye bölündü) | K-4, FR-1.1, FR-1.2 |
| 6 | `AGENTS-DOMAIN.md` | Silindi (yerine 3) | K-4, FR-1.3 |
| 7 | `AGENTS.md` | telemetry bloğu çıktı; tablo 7 dosyaya güncellendi; Vite + What's missing taşındı | K-1, FR-2.2, FR-3.1 |
| 8 | `AGENTS-INFRA.md` | "What's missing" alındı; frontmatter `space: agents` | K-7, FR-3.3 |
| 9 | `AGENTS-FRONTEND.md` | "Vite resolves packages" alındı; frontmatter `space: agents` | FR-3.3 |
| 10 | `AGENTS-UI.md` | frontmatter `space: agents` | FR-3.3 |
| 11 | `docs/architecture/AGENTS-REFERANS-MIMARISI.md` | Yeni SPEC (REV.01 SC-1 revizyonu) | Aşama 1 |
| 12 | `AGENTS.md` | Tablo 4 sütunlu **yönlendirme tablosuna** çevrildi (Dosya, Konu, Tetik, Birlikte oku) + K-9 yükleme kuralı paragrafı | K-9, FR-5.1, FR-5.2, FR-5.3 |
| 13 | `docs/architecture/AGENTS-REFERANS-MIMARISI.md` | REV.02: K-9 (yeni karar), §4.3 yönlendirme tablosu, UC-5, SC-6, A-4, T-9/T-10 | Aşama 1 (REV.02) |
| 14 | `docs/architecture/AGENTS-REFERANS-KAPANIS.md` | REV.02 doğrulama girişleri (bu satırlar) | Aşama 5 (REV.02) |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| SPEC lint | `bun run spec:check docs/architecture/AGENTS-REFERANS-MIMARISI.md` | 0 hata, 0 uyarı |
| KAPANIŞ lint | `bun run spec:check docs/architecture/AGENTS-REFERANS-KAPANIS.md` | 0 hata, 0 uyarı |
| Link bütünlüğü | `AGENTS*.md` göreli md link taraması (11 link) | 11/11 hedef mevcut, 0 kırık |
| Bayat referans | `grep "MANEUVERS\|maneuvers.ts" AGENTS-KOMUT-MANEVRA.md` | 0 eşleşme |
| Silinen dosya referansı | `grep "AGENTS-INTEGRATION\|AGENTS-DOMAIN"` (tüm repo) | Yalnız SPEC/KAPANIŞ içinde (meşru tarihçe) |
| SC-1 başlık denetimi | `grep '^## ' AGENTS.md` alan-detayı başlığı | 0 (temiz) |
| Yönlendirme tablosu (REV.02) | AGENTS.md satır sayımı (7 hedef dosya satırı) + başlık denetimi (`Tetik (yol / sembol / görev)`) | 7 satır, 4 sütun başlığı mevcut |
| SPEC + KAPANIŞ lint (REV.02) | `bun run spec:check docs/architecture/AGENTS-REFERANS-MIMARISI.md docs/architecture/AGENTS-REFERANS-KAPANIS.md` | 0 hata, 0 uyarı (2 dosya) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (özet) | Kanıt | Durum |
|:----|:--------------|:------|:------|
| AK-1.1 | INTEGRATION yok; WS-TUNNEL iki tünel sözleşmesini taşır | `AGENTS-WS-TUNNEL.md` başlıkları; `AGENTS-INTEGRATION.md` yok | 🟢 |
| AK-1.2 | DEVICE-SERVICE transport + otorite linki | `AGENTS-DEVICE-SERVICE.md`; `DEVICE-SERVICE-MIMARISI.md` linki OK | 🟢 |
| AK-1.3 | DOMAIN yok; KOMUT-MANEVRA var | `ls AGENTS-*.md`; silme kanıtı | 🟢 |
| AK-1.4 | KOMUT-MANEVRA'da bayat katalog anlatımı yok | grep 0 eşleşme | 🟢 |
| AK-2.1 | DEVICE-CONFIG telemetry + canonical taşır | `AGENTS-DEVICE-CONFIG.md#Telemetry tagging` | 🟢 |
| AK-2.2 | AGENTS.md'de detay yok, pointer var | AGENTS.md referans tablosu satırı | 🟢 |
| AK-2.3 | DEVICE-CONFIG kapsamı yalnız telemetry/canonical | dosya (tek başlık) | 🟢 |
| AK-3.1 | Tablo 7 satır, hedefler mevcut | link taraması 11/11 OK | 🟢 |
| AK-3.2 | Her AGENTS-*.md `review_date` taşır | frontmatter (7 dosya) | 🟢 |
| AK-3.3 | Her AGENTS-*.md `space: agents` | frontmatter (7 dosya) | 🟢 |
| AK-4.1 | spec:check 0 hata | A.2 kanıtı | 🟢 |
| AK-4.2 | Kırık md linki yok | A.2 link taraması | 🟢 |
| AK-4.3 | KAPANIŞ zorunlu bölümler + review_date | bu doküman + spec:check 0 hata | 🟢 |
| AK-5.1 | Tetik sütunu yol/sembol/anahtar kelime içerir | `AGENTS.md` yönlendirme tablosu (7 satır) | 🟢 |
| AK-5.2 | Birlikte oku sütunu dolu veya `—` | `AGENTS.md` yönlendirme tablosu | 🟢 |
| AK-5.3 | Yükleme kuralı paragrafı + 4 sütunlu tablo birlikte | `AGENTS.md#Detay referansları` başlık denetimi | 🟢 |
| AK-5.4 | spec:check 0 hata | A.2 kanıtı | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S-1 | SC-1 metriği revize edildi (REV.01) | Orijinal "≤ ~220 satır" hedefi, büyük kısalmanın (893→293) bu SPEC'ten önceki ayrı görevde yapılmış olması nedeniyle bu paketin kapsamıyla uyuşmuyordu. Yerine "alan-detayı başlığı yok" denetimi (sahiplik/ayrışma ölçüsü) konuldu. AGENTS.md 277 satır; kalan içerik her-görev kuralı + Elegant Object + auto-managed nx/graphify bloklarıdır. |
| S-2 | `AGENTS-KOMUT-MANEVRA.md` içeriği özet düzeyindedir | Komut/manevra/operasyon otoritesi `KOMUT-MANEVRA-OPERASYON-MIMARISI.md`'dir; referans dosyası yalnız güncel sözleşmeyi özetler (K-5, çift-write yasağı). |

### A.5 Gözle Kontrol Maddeleri

- [x] Repo kökünde 7 referans dosyası + `AGENTS.md` (SC-2)
- [x] `docs/architecture/` altında yalnız SPEC + KAPANIŞ var, AGENTS referansı yok
- [x] `AGENTS-INTEGRATION.md` ve `AGENTS-DOMAIN.md` fiziksel olarak yok
- [x] AGENTS.md referans tablosu 7 satır ve her satır mevcut dosyaya işaret ediyor
- [x] AGENTS.md tablosu 4 sütunlu (Dosya, Konu, Tetik, Birlikte oku) ve K-9 yükleme kuralı görünür (REV.02)
- [x] Hiçbir referans dosyası başka domain'in detayını kopyalamıyor (link veriyor)

### A.6 Genel Durum Özeti

Referans sistemi domain-bazlı ince bölünmeye geçirildi: `AGENTS-INTEGRATION.md` →
`AGENTS-WS-TUNNEL.md` + `AGENTS-DEVICE-SERVICE.md`, `AGENTS-DOMAIN.md` →
`AGENTS-KOMUT-MANEVRA.md`, telemetry → `AGENTS-DEVICE-CONFIG.md`. Telemetry detayı
AGENTS.md'den çıkarıldı, tablo 7 dosyaya hizalandı, frontmatter'lar `space: agents`
oldu. `spec:check` 0 hata/0 uyarı, link bütünlüğü 11/11 OK, bayat referans yok.
Tek sapma SC-1 metrik revizyonudur (S-1, gerekçeli). **Review date: 2026-12-01.**

**REV.02 (2026-10-05) — Yönlendirme tablosu:** AGENTS.md referans tablosu yol/sembol/görev
tetikli 4 sütunlu yönlendirme tablosuna genişletildi; K-9 yükleme kuralı eklendi. Böylece
referans seçimi modelin konu tahminine değil, dokunulan yol/sembol eşleşmesine dayanır.
`spec:check` 0 hata/0 uyarı; tablo 7 satır, 4 sütun. Kalan boşluk: yönlendirmenin doğru
yapıldığının otomatik denetimi (G5).

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → kanıt)

| Durum | Koşul | Beklenen (THEN) | Kanıt |
|:------|:------|:----------------|:------|
| SPEC onay | Developer SPEC'i onaylar | IMPL başlar | ✅ 2026-10-01 onayı |
| Bölme | INTEGRATION içeriği ikiye ayrılır | Tunnel ve device transport ayrı dosyalarda | A.1 #1,#2 + A.2 link |
| Yeniden adlandırma | DOMAIN kaldırılır | KOMUT-MANEVRA güncel içerikle var | A.1 #3,#6 |
| Taşıma | Telemetry bloğu AGENTS.md'den çıkar | Detay DEVICE-CONFIG'te, pointer tabloda | A.3 AK-2.1/2.2 |
| Tablo hizası | Tablo yeniden yazılır | 7 satır, hedefler mevcut | A.2 link 11/11 |
| Frontmatter | Tüm AGENTS-*.md taranır | `review_date` + `space: agents` | A.3 AK-3.2/3.3 |
| Lint | spec:check çalıştırılır | 0 hata | A.2 |
| Bayat içerik | KOMUT-MANEVRA taranır | `MANEUVERS`/`maneuvers.ts` yok | A.2 |
| Yönlendirme (REV.02) | Görev `packages/ws-tunnel/**` dosyasına dokunur | Tetik sütunu `AGENTS-WS-TUNNEL.md` satırını eşler; Birlikte oku ekler | A.3 AK-5.1 |
| Kombinasyon (REV.02) | Görev device config `canonical` alanına dokunur | `AGENTS-DEVICE-CONFIG.md` + `AGENTS-DEVICE-SERVICE.md` okunur | A.3 AK-5.2 |
| Kural görünürlüğü (REV.02) | AGENTS.md referans bölümü okunur | 4 sütunlu tablo + K-9 kural paragrafı birlikte | A.3 AK-5.3 |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Otomatik link-check CI kapısı yok (elle tarandı) | orta — yeni link kırılırsa yakalanmaz | SPEC §11: `tools/agents-link-check.mjs` + npm script |
| G2 | Frontmatter şema lint'i yok (`review_date` zorunluluğu) | düşük | SPEC §11: frontmatter şema kontrolü |
| G3 | Manevra içeriğinin KOMUT-MANEVRA SPEC ile satır-satır doğruluğu domain ekibi onayına bağlı | düşük | Domain SPEC sahibi gözden geçirir |
| G4 | `AGENTS.md` satır sayısı için sabit üst sınır yok | düşük | İhtiyaç doğarsa SC-1'e sayısal tavan eklenir |
| G5 | Doğru referansın yüklendiğinin otomatik denetimi yok (K-9 model davranışına dayanır) | orta — yanlış/eksik referansla geliştirme yapılabilir | İleri iş: dokunulan yol → beklenen referans eşleme script'i (KAPANIŞ §A kanıt satırıyla elle denetlenir) |

**review_date:** 2026-12-01
