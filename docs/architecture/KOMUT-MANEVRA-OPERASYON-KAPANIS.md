---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, komut, manevra, operasyon]
review_date: 2026-11-10
---

# Komut / Manevra / Operasyon — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer).
> **SPEC:** [KOMUT-MANEVRA-OPERASYON-MIMARISI.md](./KOMUT-MANEVRA-OPERASYON-MIMARISI.md) (onaylı — AK kaynağı).
> **Kapsam:** Çapraz akış kapanışı (platform/commands + web-service yüzeyleri). Bu turda GERÇEK diff var: tip-sıkılaştırma + eşdeğer refactor; davranış değişmedi.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/platform/commands/src/command-job-builder.ts` | (değişiklik) `(!params \|\| params[key]===undefined)` → `params?.[key]===undefined` + regex literal → `new RegExp().exec` — SEMANTİK OLARAK EŞDEĞER (lint/temizlik refaktörü) | UC-1; davranış yok |
| 2 | `packages/platform/commands/src/operation-executor-contracts.ts#OperationDefinition` | (değişiklik) `definition: unknown` → `ManeuverRecord \| OperationRecord` — TİP düzeyinde sözleşme sıkılaştırması (K1 veri/semantik ayrımının tipe yansıması) | K1 — pozitif |
| 3 | `command-job-builder.test.ts` + `operation-executor.test.ts` | (değişiklik) sıkılaşan tipe senkron test gövdeleri | T eşzamanlılığı |
| 4 | `packages/platform/commands/package.json#scripts.build` | (değişiklik) `tsc --emitDeclarationOnly` eklendi (dist + tip çıktısı) | build hijyeni |
| 5 | `maneuver-registry.ts` | (doğrulama) DB>dosya gölgeleme; disabled düşmez; ad uzayı ayrımı; mükerrer dosyada throw | K6/FR-2 |
| 6 | `operation-executor.ts` | (doğrulama) begin FAIL-CLOSED; rollback yalnız başarılı adımlar ters sıra best-effort; timer delay; divideTotal; remoteTimeoutMs | K7/K8/FR-3 |
| 7 | `tiers/boss/infrastructure/operation-requester.ts` + `tiers/site/infrastructure/hub-maneuver-channel.ts` | (doğrulama) 202→`still_running` terminal-only; `system_unreachable`; channel bu turda yalnız log-prefix hijyeni | K9/K10/FR-4 |
| 8 | `deployment/v2/dev/*/maneuvers/*.json` + `maneuver-migration.test.ts` | (doğrulama) eklemeli demo katalogları; K12 güç yasağı iki vaka ile sabit | K12/FR-5 — S2 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Test envanteri | grep `it(` platform/commands | **70 test / 4 dosya** (registry 11 + builder 16 + migration 12 + executor 31) — SPEC "70+ test" DOĞRULANDI; web-service tarafı (command-routes 18, maneuver-routes 18, field-container-commands 10, hub-maneuver-channel 4, operation-boss-routes 5, demo-earthing-interlock.spec, demo-maneuver-integration.spec 2) ÜSTÜNE | |
| AK-1.1 | builder: `err device_not_found/command_not_found/missing_param` — throw yok | ✓ |
| AK-1.2 | "`{{param}}` sayısal; `-{{param}}` negatif uygular" | ✓ |
| AK-2.1 | registry "aynı isimde iki DOSYA → kurulumda THROW"; migration "fail-fast yüklenir (12 kayıt)" ×2 | ✓ |
| AK-2.2 | "DB kaydı dosya kaydını GÖLGELER" + "disabled → dosyaya DÜŞMEZ" | ✓ |
| AK-3.1 | executor "begin FAIL-CLOSED: throw → run_persist_failed, kanal çalışmaz" + web `operation-run-store` "begin DB hatası THROW (fail-closed)" | ✓ |
| AK-3.2 | "rollback: yalnızca BAŞARILI adımlar, ters sıra" + "best-effort: kompanzasyon hatası durdurmaz" + uzaktan rollback vakası | ✓ |
| AK-3.3 | `demo-earthing-interlock.spec.ts` mevcut (web-service interlock) | ✓ |
| AK-4.1 | operation-requester.test (tiers/boss) | ✓ |
| AK-4.2 | hub-maneuver-channel.test + executor "kanal YOK → fail (kademeli)" + `system_unreachable` yolu | ✓ |
| AK-5.1/5.2 | migration: "K12: hiçbir adımda BSC charge/discharge YOK" + "bsc_prepare güç paramı TAŞIMAZ" + FL-02→OPERASYON taşınması | ✓ |
| Taze koşu / mutasyon | komutlar | **İLETİLMEDİ** — builder/executor/contracts değişti; mutasyon kapısı BU MODÜL İÇİN GERÇEKTEN KOŞULMALI (diff'li üretim .ts) |

### A.3 Kabul Kriteri Kanıtları

11/11 AK yukarıdaki envanterle karşı; tümü 🟡 (eşleşme kanıtlı, taze koşu + mutasyon iletilmedi). AK-3.x (fail-closed/rollback/interlock) fiziksel-güvenlik çekirdeği — AGENTS "komut validasyonu ≥%90 branch" listesinde; sayısal branch raporu G3.

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S1 | Diff'te davranış değişikliği YOK iddiası doğrulandı | `params?.[key]` ve `new RegExp` eşdeğer; `definition` tipi yalnız derleme zamanını sıkılaştırır (runtime aynı). K12 kapıları testte sabit kaldı |
| S2 | **B2 yaşıyor:** migration testi deployment dosyalarına SERT bağlı (12 kayıt sayısı hardcoded) | Üretim kataloğuna eklenecek her manevra `platform/commands` testini kırar (ilgisiz PR'da kırmızı) — A1 fixture işi bekliyor; kapanış riski ORTA olarak notluyor |
| S3 | K11 interlock **fail-open** (telemetri okunamazsa "nötr, izin ver") | SPEC'te bilinçli yazılı — ancak NIS-2/ASVS bakışı: fiziksel topraklama kontrolünde fail-open, "demo interlock" olduğu için kabul edilebilir; GERÇEK interlock gelmeden fail-open kararı yeniden açılmalı (SPEC K11'e uyarı satırı önerisi) |
| S4 | ✅ KAPANDI — SPEC §4.1/§6.4 yolu `tiers/site/…` = kod `tiers/site/…` (tam rename) | — |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1: kayıtlar davranış taşımıyor (`mode/onFailure/rollbackSteps` yürütücü girdisi — registry/executor vakaları)
- [x] Purity 2: yürütücü HTTP/BullMQ bilmiyor — `ICommandChannel`/`IRemoteCommandChannel`/run-store portları enjekte (executor testleri sahte portlarla dönüyor)
- [x] Purity 3: demo katalog eklemeli — üretim 12 kayıt sayısında değişiklik yok (migration fail-fast geçiyor)
- [x] Hata sözleşmesi: `Result` everywhere (builder throw yok; registry not_found/disabled err)

### A.6 Genel Durum Özeti

**MODÜL UYGUN — en yüksek güvenlik kapısı kanıtlı:** K12 çift-vakayla testli, begin fail-closed + rollback ters-sıra + interlock spec'i mevcut. Turun diff'i tip/refactor düzeyinde (S1 temiz). İki izlenecek: S2 (kırılgan migration bağı — A1) ve S3 (K11 fail-open uyarısı — gerçek interlock gelmeden kapanmaz). **NIS-2:** fiziksel yazma hattı; güvenlik AK'ları (fail-closed, güç yasağı, internal token) testli ✓; S3 tek açık tehdit-modeli tartışması. Mutasyon: diff'li üretim dosyaları var → `bun run test:mutation` bu modülde eşik-üyesi (komut validasyonu listesi) — G3.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Bilinmeyen cihaz | `build` | `err device_not_found` | `command-job-builder.test.ts` |
| `-{{power}}`, 5 | şablon | -5 | aynı |
| Mükerrer dosya manevrası | yükleme | throw (fail-fast) | `maneuver-registry.test.ts` |
| Disabled DB + aynı adlı dosya | resolve | `disabled` (dosyaya düşmez) | aynı |
| runs.begin hatası | execute | `run_persist_failed`, kanal çalışmaz | `operation-executor.test.ts` |
| 3 adım, 2. hata, onFailure rollback | yürüt | yalnız 1. ters sırada kompanze | aynı |
| charge + toprak kapalı | interlock hook | `interlock_earthed` red | `demo-earthing-interlock.spec.ts` |
| 202 yanıtı | boss kanal | `failed/still_running` terminal-only | `operation-requester.test.ts` |
| Konteyner erişilemez | uzak adım | `system_unreachable` | `hub-maneuver-channel.test.ts` |
| remoteTimeoutMs dolarsa | uzak adım | `remote_timeout` ile failed (kilitlenme yok) | operation-executor UC-13 vakaları |
| Katalogda BSC charge/discharge | tarama | YOK (K12) | `maneuver-migration.test.ts` ×2 |
| Telemetri okunamaz (interlock) | hook | nötr-izin (fail-open) — S3 | spec'in mevcut vakası olumlu yolu; fail-open dalı ayrı test **KAPSANMAYAN** (G4) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Taze koşu iletilmedi | Düşük | `nx run platform-commands:test` + web-service testleri |
| G2 | Migration↔deployment sert bağı (S2) | Orta | A1 fixture taşıma |
| G3 | Mutasyon + branch-%90 raporu (komut validasyonu yüzeyi) | Orta-yüksek | `bun run test:mutation --break 90` |
| G4 | K11 fail-open dalı ayrı test edilmiyor | Düşük (demo) | gerçek interlock tasarımında S3 kararıyla birlikte |

**review_date:** 2026-11-10

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-10 | İlk kapanış: 70 test eşleşti; diff davranışsız doğrulandı; S2 (B2) + S3 (K11 fail-open uyarısı) raporlandı | (yok — K11 uyarı satırı önerisi Developer'da) |
