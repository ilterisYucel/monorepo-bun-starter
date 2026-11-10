---
status: active
space: architecture
tags: [test-kapsami, komut, manevra, operasyon, kayit, registry, faz-a]
review_date: 2026-09-22
---

# Komut-Manevra-Operasyon — Test Kapsamı (Aşama 6/6, İP-3 — Faz A)

Bağlı tasarım: [KOMUT-MANEVRA-OPERASYON-MIMARISI.md](./KOMUT-MANEVRA-OPERASYON-MIMARISI.md)
Doğrulama: [KOMUT-MANEVRA-OPERASYON-DOGRULAMA.md](./KOMUT-MANEVRA-OPERASYON-DOGRULAMA.md)
Kapsam: **Faz A (A1-A3)** + **Faz B (B1-B5)**. Bu doküman yaşayan çalışma dokümanıdır — Faz C/D ekledikçe genişler; boşluk listesi birincil girdidir.

## 1. Senaryo Matrisi

### A1 — Kayıt şemaları (`maneuver-record.test.ts`, 23 durum)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Adım hedef seçicileri | deviceId / deviceIds / deviceTypes | üçü de tek başına kabul |
| Ham telemetries adımı | komutsuz | kabul |
| Seçici YOK | {command} | RED (tam biri) |
| İki seçici | deviceId + deviceIds | RED |
| İçerik YOK | yalnız deviceId | RED (command/telemetries en az biri) |
| Timer | durationMs pozitif + stopCommand ops. | kabul; durationMs 0 → RED |
| Bilinmeyen anahtar | extra | RED (strict) |
| Manevra kaydı | tam (ui meta + rollbackSteps) | kabul |
| steps boş | [] | RED |
| §7.1 fail-fast | onFailure rollback, rollbackSteps YOK | RED; VARSA kabul |
| Operasyon adımları | uzak / yerel manevra / yerel zincir | üçü kabul; boş nesne RED |
| field_charge deseni | §6.1 tam örnek | kabul |
| Operasyon §7.1 | onFailure rollback, rollback YOK | RED |
| Dosya kökleri | maneuvers min 1; bilinmeyen anahtar | RED kuralları |
| Yükleyiciler | bozuk JSON / şema ihlali | THROW (fail-fast); geçerli parse |

### A2 — ManeuverRegistry (`maneuver-registry.test.ts`, 7 durum)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Bilinen manevra/operasyon | resolve | Result.ok(kayıt) |
| Bilinmeyen isim | resolve | Result.err({kind: not_found}) — throw YOK |
| Tür ayrımı | manevra ismi operation'da / tersi | not_found |
| Boş kayıt seti | {} | not_found |
| Mükerrer isim | aynı türde iki kayıt | kurulumda THROW |
| Ortak isim | manevra + operasyon aynı ad | ikisi de ok (ayrı ad uzayları) |

### A3 — Migrasyon dosyaları (`maneuver-migration.test.ts`, 12 durum)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Konteyner kayıt sayısı | yükleme | 11 |
| İsim çözümleme | 11 isim | registry ok |
| K12 saflığı | adım taraması | charge/discharge YOK |
| bsc_prepare güçsüz | params taraması | powerKw YOK; close_contactors+start var |
| Field kayıt sayısı | yükleme | 11 |
| deviceTypes + divideTotal | pcs_charge | seçici + şablon + transform birebir |
| Gizli set | fl06/07/10 hidden; fl01/03/04/05 değil | birebir |
| FL-02 yokluğu | manevra listesi | fl02_charge/discharge YOK (operasyona taşındı) |
| Operasyon sayısı | yükleme | 3 |
| field_charge | §6.1 | adımlar + rollback sırası birebir |
| field_maintenance | FL-11 | uzak bakım + yerel stop |
| Operasyon çözümleme | registry | 3 isim ok |

### B1-B5 — Faz B matrisi

| Modül | Durum | Test ref |
|:------|:------|:---------|
| Executor: not_found/begin-fail-closed rejected | kayıt yok / pg yok | `operation-executor.test.ts` (17) |
| Seçici çözümleme + divideTotal + grup kısıtı + boş çözüm | deviceTypes/deviceIds/params | aynı dosya |
| onFailure stop/continue/rollback + best-effort kompanzasyon | başarılı-hedef kesişimi, ters sıra | aynı dosya |
| Timer planlama (başarı şartı + hata audit) | timer.schedule | aynı dosya |
| Operasyon adımları (manevra/zincir/uzak-fail) + üst rollback | operation record | aynı dosya |
| operation_runs PG (DDL/INSERT/UPDATE/okuma) | fake ISqlDatabase | `operation-run-store.test.ts` (6) |
| Komut kanalı (job üretimi/raw fallback/kuyruk hatası/schedule) | builder + fake mq | `command-channel.test.ts` (9) |
| Hedef çözümleyici (type/online kesişimi) | fake DeviceRegistry | aynı dosya |
| Rotalar: yetki (admin/teknik/iç token), HTTP eşlemesi, runs | fake executor/store | `maneuver-routes.test.ts` (15) |
| Timer hack → timer alanı (register çözümlü stop + audit) | mock config stop komutu | `command-routes.test.ts` (14) |
| operation_defs PG (create dup/upsert/soft delete) | fake ISqlDatabase | `operation-def-store.test.ts` (6) |
| Hibrit registry (gölgeleme/disabled/fallback) | fake IOperationDefSource | `maneuver-registry.test.ts` (12) |

## 2. KAPSANMAYAN Boşluklar

| # | Boşluk | Neden | Ne zaman |
|:--|:-------|:------|:---------|
| G-1 | `IOperationDefStore` (DB) + hibrit çözümleme (DB > dosya) | ✅ B5 tamamlandı | — |
| G-2 | Seçici ÇÖZÜMLEMESİ (deviceTypes → online+müsait cihazlar; deviceIds kesişimi) | ✅ B1 tamamlandı | — |
| G-3 | `divideTotal` transform uygulaması | ✅ B1 tamamlandı | — |
| G-4 | Timer planlama (BullMQ delay) | ✅ B4 tamamlandı | — |
| G-5 | Kayıt dosyalarının web-service'e env bağlanması (wire-up) | ✅ B3 tamamlandı (MANEUVER_CONFIG_DIR + compose mount'ları) | — |
| G-6 | Admin tanımlı kayıtların DB şemasıyla birebir doğrulaması | ✅ B5 tamamlandı (zod persist anında) | — |
| G-7 | Frontend kataloğunun GET /api/maneuvers'e taşınması | Faz D2 | İP-7 |
| G-8 | Uzak adım gerçek kanalı (IRemoteCommandChannel) | Faz C | İP-5 |
| G-9 | Kural motoru maneuver/operation aksiyonları | Faz D1 | İP-6 |

## 3. Kapsanan Durum Özeti

- Faz A toplamı: **42 durum** (23 şema + 7 registry + 12 migrasyon) — üç test dosyası.
- Kapılar: ManeuverRegistry %100 branch (tüm dallar testli); şema refine'larının her red yolu testli.

`review_date: 2026-09-22`
