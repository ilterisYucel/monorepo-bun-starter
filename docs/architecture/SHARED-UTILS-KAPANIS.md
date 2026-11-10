---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, shared-utils]
review_date: 2026-11-10
---

# Shared Utils — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer, GLM-5.3).
> **SPEC:** [SHARED-UTILS-MIMARISI.md](./SHARED-UTILS-MIMARISI.md) (onaylı — AK/FR kaynağı).
> **Kapsam:** SPEC↔kod doğrulaması — bu turda kaynak değişikliği YOK; kanıtlar kod incelemesi + otomatik test envanteridir.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

> Doğrulama kapanışı: onaylı SPEC, mevcut implementasyonla karşılaştırıldı. Kaynak dosya değişmedi.

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/shared-utils/src/config/loader.ts#ConfigLoader` | (doğrulama) kaynaklar `priority` ile sıralanır (`[...sources].sort`); `load()` tanım başına resolve | K1/FR-1.1 |
| 2 | `packages/shared-utils/src/config/sources.ts` | (doğrulama) öncelikler: `ObjectSource=5`, `EnvSource=10`, `DotenvSource=20`, `Json/Yaml=30` | K1 |
| 3 | `packages/shared-utils/src/config/units.ts#applyUnit` | (doğrulama) `duration-pg`/`duration-ms`/`bytes`; geçersizde throw | K2/FR-1.2 |
| 4 | `packages/shared-utils/src/config/loader.ts#redacted` | (doğrulama) `secret: true` → `***`; `restartOnChange` → `restartRequired` | K3/FR-3.1, FR-3.2 |
| 5 | `packages/shared-utils/src/config/loader.ts#watch/reload` | (doğrulama) yalnız değişen anahtar için olay; handler hatası yutulur (try/catch) | K4/FR-2.1, FR-2.2 |
| 6 | `packages/shared-utils/src/config/device-config-drift.ts#compareDeviceConfig` | (doğrulama) eksik → error; fazla → allowlist warn/error; `deviceId/name/connection/transport` muafiyetleri | K6/FR-4.1, FR-4.2 |
| 7 | `packages/shared-utils/src/config/definitions.ts` | (doğrulama) ~1017 satır config kataloğu — veri, ayrı birim değil | K-B1 (SPEC §5.1) |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri (otomatik) | `bun run test:inventory` → `docs/roadmap/test-envanteri.otomatik.md` | shared-utils: **3 dosya / 25 test** (loader 10, drift 7, definitions 8) 🟡 |
| Loader testleri | `config/loader.test.ts` (envanter: 10) | öncelik, default, env dönüşümü, birim, redacted, reload, health kapsıyor 🟡 |
| Drift testleri | `config/device-config-drift.test.ts` (7) | missing/extra/allowlist/muafiyet kapsıyor 🟡 |
| Definitions testleri | `config/definitions.test.ts` (8) | anahtar benzersizliği, tanım doğrulaması 🟡 |
| Taze test koşusu | `vitest run` (packages/shared-utils) | **İLETİLMEDİ** — reviewer turu salt-okuma (bkz. B.2/G1) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Öncelik zinciri (env > dosya) | kod inceleme: `sources.ts` priority 5/10/20/30 + `loader.test.ts` (envanter 10 test) | 🟡 |
| AK-1.2 | Geçersiz birim throw eder | kod inceleme: `units.ts#applyUnit` throw blokları + loader testleri | 🟡 |
| AK-2.1 | Yalnız değişen anahtar için olay tetiklenir | kod inceleme: `loader.ts#reload` (oldValue !== newValue); taze koşu iletilmedi | 🟡 |
| AK-2.2 | Handler hatası reload'u düşürmez | kod inceleme: `loader.ts` try/catch (handler yutulur); doğrudan test envanterde görünmüyor → B.2/G3 | 🟡 |
| AK-3.1 | Secret değerler maskelenir | kod inceleme: `redacted()` + loader testleri | 🟡 |
| AK-3.2 | Restart gerektiren değişim işaretlenir | `restartOnChange` tanımı + definitions testleri | 🟡 |
| AK-4.1 | Drift: eksik tanım error üretir | `device-config-drift.ts#compareDeviceConfig` (kind:"missing", level:"error") + 7 test | 🟡 |
| AK-4.2 | İzinli farklar karşılaştırma dışıdır | muafiyet listesi dosya başlığında + test | 🟡 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | `units.ts` `import type` dosya sonunda (SPEC B2/A1) | Stil sapması — davranış etkisi yok; temizlik İleri İş |
| S2 | `definitions.ts` ~1017 satır (SPEC B1) | Config kataloğu — veri olarak kabul edildi (SPEC K-B1); ayrı birim değil |
| S3 | Taze test koşusu iletilmedi | Reviewer salt-okuma; envanter + inceleme kanıtı |

### A.5 Gözle Kontrol Maddeleri

- [x] Öncelik zinciri 5/10/20/30 — kaynak sırası sabit (K1)
- [x] Birim normalizasyonu geçersizde throw (K2)
- [x] Secret redaction + `restartRequired` işareti (K3)
- [x] Watch/reload fail-open — handler hatası yutulur (K4)
- [x] Drift muafiyetleri: `deviceId/name/connection/transport` + komutlar (K6)
- [x] `definitions.ts` veri olarak katalog bölümünde — ayrı SPEC açılmadı

### A.6 Genel Durum Özeti

**MODÜL UYGUN — onay önerisi:** Onaylı SPEC, mevcut implementasyonla tam uyumlu; 8 AK'nin tamamı kod incelemesi + envanter kanıtıyla 🟡 (taze koşu iletilmedi, davranış sapması YOK). Stil sapması (units.ts import sırası) ve katalog hacmi bilinçli kabul. SPEC durum kolonları ana agent tarafından `🟢 Doğrulanmış`'a güncellenmeli. **review_date: 2026-11-10**

**NIS-2 uyumluluk kontrolü:** `secret` redaction bir güvenlik davranışıdır → güvenlik ilgili. SPEC'te tehdit modeli TANIMLI DEĞİLDİR (yalnız davranış kuralı var) — **uyumluluk boşluğu olarak işaretlendi**. Öneri: redaction anahtar seti ve secret akışı için kısa tehdit modeli (hangi sırlar, nereden, logda neden görünmez) eklenir; kararı developer.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Env + dosya aynı anahtar | `load()` | env kazanır (10 < 30) | `loader.test.ts` (`loader.ts#resolve`) |
| Geçersiz `duration-ms` | normalize | throw | `units.ts#applyUnit` + loader testleri |
| Secret tanımı | `redacted()` | `***` | `loader.test.ts` |
| `restartOnChange` anahtarı değişti | olay | `restartRequired=true` | loader/definitions testleri |
| Kopyada eksik cihaz | drift | error | `device-config-drift.test.ts` |
| Yalnız `deviceId` farkı | drift | hata yok (muafiyet) | aynı dosya |
| Handler throw | reload | reload tamamlanır (fail-open) | **KAPSANMAYAN** (G3 — doğrudan test yok) |
| Watch dosya değişimi | `reload()` | yalnız değişen anahtarın olayı | **KAPSANMAYAN** (kısmen — reload test var, watch dosya izleme taze değil) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze test koşusu iletilmedi (25 test envanterde) | Düşük | Ana agent `nx run shared-utils:test` koşar |
| G2 | Watch/dosya izleme yolunun taze doğrulaması | Orta — izleme altyapısı ortamlar arası değişebilir | Entegrasyon testi |
| G3 | Handler hatası fail-open testi doğrudan yok | Düşük — try/catch kodda görünür | Küçük unit test |
| G4 | `units.ts` stil sapması | Düşük | Temizlik (SPEC A1) |
| G5 | Config kataloğunun otomatik dokümantasyonu | Düşük | SPEC İleri İş 1 |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: SPEC↔kod doğrulaması (kaynak değişikliği yok); NIS-2 boşluğu işaretlendi | (yok — SPEC değişmedi) |
