---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, plugin-sdk, sec]
review_date: 2026-11-10
---

# Plugin SDK — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [PLUGIN-SDK-MIMARISI.md](./PLUGIN-SDK-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Bu turda GERÇEK davranış değişikliği var: `{env:VAR}` config süstitüsyonu eklendi (T-18).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/plugin-sdk/src/context.ts#JsonFilePluginConfigSource.read` | (değişiklik) yüklenen config ağacı `#substituteEnvRefs`'ten geçer; `{env:VAR}` tam-eşleşme regex (ENV_REF), iç içe obje/dizi destekli, eksik env → `""` | B2(T-18) — S1 (kayıt dışı karar) |
| 2 | `packages/plugin-sdk/src/context.ts#FilePluginStateStore` | (doğrulama) state yazımı tmp+rename atomik; config yoksa `{}` | K6/FR-3.1, FR-3.2 |
| 3 | `packages/plugin-sdk/src/registry.ts#PluginRegistry` | (doğrulama) isim çakışması reddi; sdkVersion aralık kapısı; `deactivateAll` allSettled+temizlik; health toplama | K4/FR-1.1, FR-1.2 |
| 4 | `packages/plugin-sdk/src/sdk-version.ts#SemVerRange` | (doğrulama) yalnız `>=`/`<`; geçersiz ifade throw | K5 |
| 5 | `packages/plugin-sdk/src/loader.ts#PluginLoader` | (doğrulama) statik+dizin hibrit; manifest'siz giriş atlanır; aynı isimde ilki kazanır; yok dizin → boş | K2/FR-2.1 |
| 6 | `packages/plugin-sdk/src/http/http-client.ts#HttpClient` | (doğrulama) baseUrl/header/timeout; 5xx+ ağ hatası retry; 4xx → `HttpError` (retry yok); govde/durum taşınır | K8/FR-4.1, FR-4.2 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | grep `it(` plugin-sdk/src | **26 test / 5 dosya** (context 5, registry 5, sdk-version 4, loader 5, http-client 7) — SPEC "mevcut 25" **1 geride**: `{env}` testi bu turda eklendi (S2) |
| Çakışma | AK-1.1 — registry "ayni isimdeki ikinci kaydi reddeder" | ✓ |
| Semver | AK-1.2 — registry "SDK versiyon uyumsuzlugunu reddeder" + sdk-version 4 vaka | ✓ |
| Yükleme | AK-2.1 — loader "dizin kaynagindan plugin yukler (runtime plugin)" + manifest'siz atlama | ✓ |
| Context | AK-3.1/3.2 — context "yazma/okuma/silme turu" (tmp+rename kodu) + "config dosyasi yoksa bos obje" | ✓ |
| HTTP | AK-4.1/4.2 — http-client "5xx hatasinda yeniden dener" + "4xx ... HttpError firlatir" | ✓ |
| Taze koşu | `nx run plugin-sdk:test` | **İLETİLMEDİ** (G1) |
| Mutasyon | `bun run test:mutation` | **İLETİLMEDİ** — context.ts değişti; koşmalı (G2) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt | Durum |
|:----|:--------------------|:------|:------|
| AK-1.1 | İsim çakışması reddi | registry #2 — envanter | 🟡 |
| AK-1.2 | Semver kapısı | registry #3 + sdk-version #1–4 | 🟡 |
| AK-2.1 | Dizin yükleme sözleşmesi | loader #2 (+ #5 manifest'siz atlama) | 🟡 |
| AK-3.1 | Atomik state yazımı | context #1 + kod (`rename(tmp)`) | 🟡 |
| AK-3.2 | Config yoksa `{}` | context #3–4 (+ bozuk dosya→`{}` #2) | 🟡 |
| AK-4.1 | 5xx retry | http-client #4 + #6 (ağ hatası maxRetries) | 🟡 |
| AK-4.2 | 4xx HttpError | http-client #5 + #7 (govde/durum) | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | `{env:VAR}` davranışı SPEC kararlarında YOK | T-18 ile gelen config-yükleme davranışı K6'ya yayılmış ama ne K ne FR/AK olarak kayıtlı; semantiği de karar ister: eksik env → `""` mü (şu an), yoksa hata mı (INTEGRATION-MIMARISI UC-3 edge'i "activate hatası" diyor — S3 ile birlikte tek kararda birleşmeli). **SPEC Revizyon Önerisi** aşağıda |
| S2 | Test sayacı: SPEC 25, envanter 26 | Eklenen `{env}` testiyle SPEC geride kaldı — belge düzeltmesi |
| S3 | Eksik env sessiz `""` | `process.env[x] ?? ""` → plugin boş credential ile aktive olur, hata geç (fetch/CAS) yakalanır. Güvenlik-hijyeni açısından "fail-fast" tercih edilebilir; karar developer (INTEGRATION-S S2 ile aynı düğüm) |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: runtime bağımlılık yok (yalnız devDeps — package.json incelemesi)
- [x] Purity 3: zamanlama SDK'da yok (`schedule()` yalnız bildirim; repeatable job host'ta — INTEGRATION turu)
- [x] CQS: registry komut/sorgu ayrımı (K7) — `register` void, `find/names/health` sorgu

### A.6 Genel Durum Özeti

**MODÜL UYGUN — 1 kayıtdışı davranışla:** 7/8 AK kanıtlı (AK-1.3/2.x/3.x/4.x tam; manifest boş edge'i registry vakalarında). `{env}` süstitüsyonu repo sır-hijyeni zincirinin (EPIAS B2 → INTEGRATION K6 → T-18) SDK ayağıdır ve testli; eksik olan SPEC kaydı (S1) + eksik-env semantiği kararı (S3). **NIS-2:** config yükleme sır sınırındadır; `{env}` deseni doğru yön — edge davranışının fail-fast olması önerilir. Mutasyon G2 (context.ts değişti).

### SPEC Revizyon Önerisi

- **K6 →** "Config `<configDir>/<plugin>.json`, yoksa `{}`; **`{env:VAR}` biçimindeki string değerler yüklemede ortam değişkeniyle değiştirilir (iç içe dahil); eksik env'in akıbeti: `""` (mevcut) ya da yükleme hatası — developer kararı tek satırda bağlanmalı.**" + yeni FR/AK: "`{env:VAR}` çözümü testli" (context #5 mevcut, eşleşme hazır).

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Aynı isim ikinci kayıt | register | reddedilir | `registry.test.ts` #2 |
| sdkVersion `">=99"` | register | uyumsuzluk hatası | #3 |
| Dizin kaynağı | loader.run | `plugin.json`+named export yüklenir | `loader.test.ts` #2 |
| Manifest yok | dizin girişi | atlanır, çökmez | #5 |
| State yazımı | save | tmp+rename | `context.test.ts` #1 |
| Config yok | read | `{}` | #4 |
| Bozuk config | read | `{}` (+hata raporu yok — edge notu) | #2 |
| `{env:VAR}` | ortam tanımlı | değer çözülür (nested) | #5 |
| `{env:YOK}` | ortam tanımsız | `""` — S3 | **KAPSANMAYAN** (G3) |
| 503 | getJson | retry + başarılı dönüş | `http-client.test.ts` #4 |
| 404 | getJson | HttpError, retry YOK | #5 |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze `nx run plugin-sdk:test` iletilmedi | Düşük | Ana agent |
| G2 | Mutasyon verisi yok (context.ts diff'li) | Orta | `bun run test:mutation` |
| G3 | Eksik-env dalı (`?? ""`) test edilmedi | Düşük-orta — S3 kararıyla birlikte tek `it()` | S3 ile eşzamanlı |
| G4 | Bozuk STATE dosyası edge'i (SPEC: "boş state + hata raporu") — #2 boş döner, "hata raporu" yarım | Düşük | log/return ayrıntısı kararı |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: `{env}` değişikliği + 26 test; S1/S3 için SPEC revizyon önerisi (K6 satırı) | (öneri — K6 genişletme, developer onayı bekliyor) |
