---
status: active
space: architecture
tags: [test-kapsami, kural-motoru, v2, aksiyon]
review_date: 2026-09-22
---

# Kural Motoru v2 — Test Kapsamı (İP-6, KOMUT Faz D1)

Bağlı tasarım: [KURAL-MOTORU-V2-MIMARISI.md](./KURAL-MOTORU-V2-MIMARISI.md)
Doğrulama: [KURAL-MOTORU-V2-DOGRULAMA.md](./KURAL-MOTORU-V2-DOGRULAMA.md)

## 1. Senaryo Matrisi

### Şema (`automation-rule.test.ts` — 26, +1 yeni senaryo)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| maneuver/operation aksiyonu | name + opsiyonel params | kabul |
| name eksik / boş | — | RED |
| Bilinmeyen aksiyon | teleport | RED (test güncellendi — maneuver artık gerçek) |

### Kanal (`maneuver-operation-channel.test.ts` — 7)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| POST kontratı | yöntem/yol/gövde/başlıklar | birebir (x-gd-trace-id + x-internal-token) |
| maneuver öneki | /api/maneuvers/... | birebir |
| rolled_back | 200 | ok (terminal) |
| failed/rejected/409 | reason | ok:false + reason |
| 202 | — | ok + started |
| network/503 | — | ok:false (throw YOK) |
| timeout | AbortController | ok:false + "timeout" |

### ActionExecutor (`action-executor.test.ts` — 22, +4)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| kanal YOK | — | fail channel_not_configured + auto_rule_action_failed |
| ok | kanal | trace auto:<kural> + auto_rule_action_ok (name context) |
| 202 | started | ok + started context |
| fail (409) | disabled | auto_rule_action_failed + sonraki aksiyon devam |

### Rotalar (`maneuver-routes.test.ts` — 17, +2)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| uzun yürütme | 15 sn aşımı | 202 {status:"running"}; arka plan biter |
| hızlı yürütme | — | normal sonuç (202 DEĞİL) |

### Field kuralları (`field-rules.test.ts` — 5)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| r06 → maneuver(fl06_recovery) | — | komut aksiyonu YOK; log+notify |
| SOC örneği | disabled | operation(field_discharge) + params |
| K-M4 | — | charge/discharge KOMUT aksiyonu yok |

### Değişmezlik kapısı

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| RuleEvaluator | İP-6 | DEĞİŞMEDİ — 17/17 (kenar/debounce/cooldown) |

## 2. KAPSANMAYAN Boşluklar

| # | Boşluk | Neden | Ne zaman |
|:--|:-------|:------|:---------|
| G-1 | UC-1 uçtan uca (gerçek kural ateşlemesi → manevra → cihaz etkisi) canlı stack'te | docker + gözle demo | devreye alımda |
| G-2 | `islanding_recovery` operasyon kaydı (UC-1 örneği) | katalogda yok — S-1 (recovery manevradır) | ihtiyaç doğarsa |
| G-3 | ActionExecutor terminal durum TAKİBİ (202 sonrası operation_* audit'ten) | §3.2 "terminal durum audit olaylarından izlenir" — bugün yalnızca "başlatıldı" sayılır (spec birebir) | ihtiyaç doğarsa |

`review_date: 2026-09-22`
