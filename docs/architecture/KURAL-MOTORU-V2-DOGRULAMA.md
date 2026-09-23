---
status: active
space: architecture
tags: [dogrulama, kural-motoru, v2, manevra, operasyon, aksiyon]
review_date: 2026-09-22
---

# Kural Motoru v2 — Doğrulama Dokümanı (İP-6, KOMUT Faz D1)

Bağlı tasarım: [KURAL-MOTORU-V2-MIMARISI.md](./KURAL-MOTORU-V2-MIMARISI.md)

## 1. Genel Durum

| Görev | Durum | Kanıt |
|:------|:------|:------|
| D1 — `maneuver`/`operation` aksiyon tipleri + STRICT şema | ✅ | `automation-rule.test.ts` 26/26 (+1 senaryo, bilinmeyen-tip testi güncellendi) |
| D2 — `HttpManeuverOperationChannel` (iç token + 20 sn timeout + 202 started) | ✅ | `maneuver-operation-channel.test.ts` 7/7 |
| D2 — `ActionExecutor` manevra/operasyon yolları (kademeli bozulma) | ✅ | `action-executor.test.ts` 22/22 (+4 test) |
| D2 — web-service execute rotalarına 15 sn → 202 (arka plan devam) | ✅ | `maneuver-routes.test.ts` 17/17 (+2 test) |
| D3 — rules.json örnekleri (r06_recovery → maneuver; SOC örneği → operation) | ✅ | `field-rules.test.ts` 5/5 |
| Wiring — management-service run.ts kanal bağlantısı | ✅ | management-service 121/121 |
| Kapı — mevcut değerlendirme testleri DEĞİŞMEDEN yeşil (RuleEvaluator dokunulmadı) | ✅ | `rule-evaluator.test.ts` 17/17 (İP-6'da değişiklik YOK) |

## 2. Değişiklik Matrisi

| Değişiklik | Dosya(lar) | Geçme |
|:-----------|:-----------|:------|
| RuleAction + şema: maneuver/operation (name min 1 + params) | `packages/shared-types/src/automation-rule.ts` | ✅ 26/26 |
| Delegasyon kanalı (HTTP + iç token + AbortController timeout + 202) | `services/management-service/src/maneuver-operation-channel.ts` (YENİ) | ✅ 7/7 |
| ActionExecutor: `maneuverOperations` kanalı + iki aksiyon yolu | `services/management-service/src/action-executor.ts` | ✅ 22/22 |
| Execute rotaları: 15 sn senkron üst sınır → 202 (arka plan yürütme) | `services/web-service/src/presentation/routes/maneuver-routes.ts` | ✅ 17/17 |
| Field rules.json: r06 → maneuver(fl06_recovery); SOC örneği (disabled) | `services/management-service/deployment/config-field/rules.json` | ✅ 5/5 |
| Field kural testi: manevra delegasyonu sözleşmesi | `services/management-service/src/field-rules.test.ts` | ✅ |
| run.ts: HttpManeuverOperationChannel wiring (FIELD_WEB_SERVICE_URL + token) | `services/management-service/run.ts` | ✅ |

## 3. Kabul Kriteri Kanıtları

| Kod | Kriter | Sonuç |
|:----|:-------|:------|
| D1 | Şema genişletme; RuleEvaluator'a DOKUNULMADAN değerlendirme testleri yeşil | ✅ rule-evaluator.test.ts İP-6'da değişmedi — 17/17 |
| D2 | İç token kanalı, timeout, 202 + durum, trace kimliği; kanal yoksa fail (kademeli) | ✅ kanal testleri 7/7 + ActionExecutor 4 test (channel_not_configured dahil) |
| D3 | rules.json örnekleri | ✅ r06 → maneuver; soc_discharge_example (enabled:false) → operation |
| UC-1 | R-06 kural → manevra delegasyonu uçtan uca | ✅ ActionExecutor delegasyonu + kanal; uçtan uca kural ateşlemesi önceki katmanlarla (cooldown kenar-tetik DEĞİŞMEDİ) |
| UC-4 | 409 → auto_rule_action_failed (operation_disabled) — akış devam | ✅ kanal fail reason + ActionExecutor kademeli test |
| Kapı | ActionExecutor yeni yollar ≥%90 branch | ✅ 4 yeni test: kanal yok / ok / started(202) / fail+devam — tüm dallar kapsandı |

## 4. Sapmalar (kayıt)

| Kod | Sapma | Neden |
|:----|:------|:------|
| S-1 | **r06_recovery → `maneuver` (fl06_recovery), `operation` DEĞİL** — KURAL-MOTORU-V2 UC-1 `islanding_recovery` operasyonunu örnek gösteriyordu; bizim field kataloğunda recovery bir MANEVRAdır (FIELD-REV01 §3.6: konteynerde komut ÇALIŞTIRILMAZ — uzak adım yok) | REV.01.5 operasyon kriteri: başka sistemde komut/manevra çalıştırma YOKSA operasyon DEĞİLDİR. UC-1'in ruhu (kural → kayıt delegasyonu) korunur; kayıt türü kataloğa uygun |
| S-2 | **SOC örneği `field_discharge` operasyonuna bağlandı** (UC-2 `soc_balance` kaydı bizde yok) | D3 "örnek" — mevcut katalog kaydına delegasyon; `enabled:false` (canlı kural setini kirletmez, K-A4 fail-safe) |
| S-3 | **Kanal timeout'u 20 sn** (spec "15 sn senkron bekleme üst sınırı" route tarafındadır) | Route 15 sn'de 202 döner; kanal 202'yi yakalayabilmek için eşikten BÜYÜK olmalı (yarış yok) |
| S-4 | 202'de `{status:"running"}` döner (runId YOK) | Spec: "202 + operation_runs durum sorgulaması" — çağıran (kural) runId'yi SORGULAMAZ ("başlatıldı" sayar, terminal durum audit'ten izlenir); insan istemci /api/operations/runs'dan bakar |

## 5. Gözle Kontrol — Kanal Kontratı Uyumu (2026-09-22)

| Kanal davranışı | web-service route davranışı | Uyum |
|:----------------|:----------------------------|:-----|
| POST /api/maneuvers|operations/:name/execute + {params} | executeBodySchema {params, deviceIds?} | ✅ |
| x-internal-token | authorizeCommand fail-closed | ✅ |
| 200 + status completed/rolled_back → ok | replyFor | ✅ |
| 422 failed → ok:false reason | replyFor | ✅ |
| 409 disabled → ok:false reason=disabled | replyFor (disabled → 409) | ✅ |
| 202 → started | 15 sn aşımı → 202 | ✅ |

`review_date: 2026-09-22`
