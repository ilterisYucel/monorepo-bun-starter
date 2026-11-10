---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, demo, nova]
review_date: 2026-11-10
---

# Demo — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [DEMO-MIMARISI.md](./DEMO-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Doğrulama kapanışı — demo yüzeyi bu turda davranış değiştmedi; `session-auth/api-base` diff'leri SITE kopyası tarafında (B1 borcu).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/ui/src/nova/nova-mimic.ts#createNovaMimic` | (doğrulama) framework'süz çekirdek; `destroy()`; iki örnek izole | K2/FR-1 |
| 2 | `apps/demo-field/src/features/demo-data/mapFieldToMimicState.ts#fanOutUnits` | (doğrulama) 1→9 fan-out; PCS MW÷9, PCS başına MW÷18 — toplam korunumu testli | K3/FR-2.1 |
| 3 | İstasyon modeli katmanı | (doğrulama) hub payload'ında istasyon yok; topoloji `GET /api/fields/:fieldId/topology`'de (demo-topology.test) | K4/FR-2.2 |
| 4 | `apps/demo-field/src/features/demo-data/demoManeuverApi.ts` + katalog dosyaları | (doğrulama) demo katalogları eklemeli; üretim kayıtlarına dokunmuyor | K5/FR-4.1 |
| 5 | `apps/demo-field/src/lib/api-base.ts` + `features/auth/session-auth.ts` (diff'li) | (değişiklik) yalnız başlık YOL YORUMLARI `apps/field → apps/site` — davranış yok; ikiz-kopya borcu devam (SITE B1 ile aynı) | B1 — S2 |
| 6 | Tema/register modları | (doğrulama) `applyNovaVars` light/dark; `register-sources.test` + `DemoRegMode` localStorage persist | K7/K8/FR-3 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | glob | **23 nova dosyası + 27 demo-field dosyası = 50** (SPEC "51 test dosyası" — ±1; envanter komutuyla netleşir, S1) |
| UC-1 | nova-mimic.test (izolasyon+destroy), apply-nova-vars, mimic-source-map | |
| UC-2 | mapFieldToMimicState.test (fan-out/total), demo-stations, demo-topology, deriveKpis, buildTrendSeries | |
| UC-3 | nova-components.test.tsx, DemoRegMode, register-sources, demo-theme, Demo*View testleri | |
| UC-4 | demoManeuverApi.test + demo-maneuver.integration + demo-permissives/demo-teias (eklemeli kanıtlar) | |
| Entegrasyon | `apps/demo-field/integration/*.integration.test.ts` 11 dosya (docker stack gerekir) | Koşu dışı bu tur |
| Taze koşu / mutasyon | komutlar | **İLETİLMEDİ / verisi yok** — demo .ts diff'leri yalnız yorum başlığı; davranış değişmedi |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt | Durum |
|:----|:--------------------|:------|:------|
| AK-1.1 | İzolasyon | nova-mimic.test | 🟡 |
| AK-1.2 | destroy temizliği | aynı dosya | 🟡 |
| AK-2.1 | Toplam korunumu | mapFieldToMimicState.test | 🟡 |
| AK-2.2 | İstasyon hub'a sızmaz | demo-topology + kod inceleme | 🟡 |
| AK-3.1 | İngilizce konsol | nova-components.test.tsx | 🟡 |
| AK-3.2 | Register modu persist | DemoRegMode + register-sources | 🟡 |
| AK-4.1 | Eklemeli katalog | demoManeuverApi.test | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | Test dosyası sayımı: SPEC 51, elle-sayım 50 | Entegrasyon dosyalarının dahil/hariç sayımından kaynaklanıyor olabilir; `bun run test:inventory` ile tek sayıya bağlanır — belge notu |
| S2 | B1 ikiz `api-base` borcu canlı | SITE-KAPANIŞ B1 ile aynı (bayt-bayt kopya) — A2 İleri İş |
| S3 | B2 Nova CSS sızıntısı | Değişmedi — UI A1 ile aynı açık karar |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: nova modülleri saf (Date.now/IO yok — testler deterministik)
- [x] Purity 2: kök servislerde demo davranışı YOK; kataloglar eklemeli JSON
- [x] Demo ürün app'lerine import sızmıyor (ürün SPEC'leri demo'ya bağımlı değil)

### A.6 Genel Durum Özeti

**MODÜL UYGUN:** 7/7 AK envanterde karşılık buluyor; sayım ±1 (S1) ve ikiz-kopya borcu (S2) notlu. **NIS-2:** demo — üretim yüzeyi değil; ek güvenlik AK'sı gerekmez (K5 eklemelilik üretim davranışını koruyor, testli). Mutasyon: uygulanmaz.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| İki mimic | eşzamanlı kurulum | karşılıklı etkilenmez | `nova-mimic.test.ts` |
| destroy() | dinleyiciler | temizlenir | aynı |
| 9 MW PCS | fan-out | ünite başına 1 MW, toplam 9 | `mapFieldToMimicState.test.ts` |
| Hub verisi | istasyon modeli | payload'da YOK | demo-topology + kod inceleme |
| Konsol etiketleri | render | İngilizce sabit | `nova-components.test.tsx` |
| Register modu | refresh | localStorage'ta kalır | `DemoRegMode.test.tsx` |
| Katalog | kök okuma | üretim kayıtları aynen | `demoManeuverApi.test.ts` |
| Bozuk SVG | kurulum | hata (edge) | **KAPSANMAYAN** (G2) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | 11 entegrasyon dosyası docker stack ister — bu kapanışta koşulamadı | Düşük (demo) | stack'li turda `test:integration` |
| G2 | Bozuk-SVG edge vakası | Düşük | tek test |
| G3 | Sayım netliği (S1) | Düşük | `bun run test:inventory` |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 7/7 AK; ±1 sayım notu; ikiz-kopya ve CSS borçları teyit | (yok — SPEC değişmedi) |
