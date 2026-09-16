---
status: active
space: architecture
tags: [test-kapsami, manevra, field, otomasyon]
review_date: 2026-09-15
---

# Field Manevra Kataloğu REV.01 — Test Kapsamı (Aşama 6/6)

> **Yaşayan doküman** (AGENTS hibrit kural). Kapsam: `apps/field/src/features/field-control/*` + `services/management-service/deployment/config-field/rules.json`.

## 1. Manevra kataloğu — `maneuvers.test.ts` (16)

| Durum | Koşul | Beklenen |
|:------|:------|:---------|
| Katalog tamlığı | pcsIds verilir | 11 manevra (8 kart + 3 gizli), sabit sıra |
| FL-01 başlatma | parallel | tüm PCS'lere `start` |
| FL-03 idle | — | `set_power_zero` (şarj/deşarj YOK) |
| FL-05 e-stop | — | `stop`; rollback yok |
| FL-02 rollback | — | `stop` (güvenli geri dönüş) |
| FL-06 recovery | gizli | `fault_reset` + `standby` |
| FL-07/FL-10 | gizli | `stop` |
| Hidden set | — | FL-06/07/10 içeride; FL-02 dışarıda |
| Boş pcsIds | — | tüm manevralar boş adımlı |
| stepsFor | liste/boş | birebir |
| FL-02 kontrol girişleri | — | group (options −1/0/1) + powerKw (500) |
| FL-04 timer | — | timerConfig true |
| Santral dağıtım | 500kW, 2 PCS | 250/250 |
| Grup seçimi | grup=1, 500kW | yalnız PCS-2, 500kW |
| Transform yok | — | adımlar aynen; params yok |
| Küsürat | 1000kW, 2 PCS | 500/500 (floor) |

## 2. R-06 kuralı — `field-rules.test.ts` (4)

| Durum | Beklenen |
|:------|:---------|
| Dosya geçerliliği | r06_recovery tek kural |
| Tetikleyici | E-stop eq 0 + PCS Fault eq 0 (all) |
| Aksiyonlar | fault_reset + standby + log + notify — **şarj/deşarj YOK** (K-M4) |
| Debounce | 2000 ms (düşen kenar doğrulaması) |

## 3. Panel davranışı (gözle/kod — birim testi yok)

- Hidden manevralar kart olarak render EDİLMEZ (panel filtresi).
- `onRun(values)` → `resolveSteps` (grup + dağıtım) → mockExecute.
- i18n: 24 yeni anahtar tr/en birebir (derleme + render).

## KAPSANMAYAN (boşluklar)

| # | Boşluk | Neden | Öncelik |
|:--|:-------|:------|:--------|
| M1 | Panel bileşen testi (render/hidden/input akışı) | mock backend'e bağlı; E2E devreye alımda | Orta |
| M2 | N konteyner ölçekleme E2E'si (PCS-2..N config şablonu) | 1 konteyner MVP | Faz 1 |
| M3 | R-06'nın gerçek E-stop simülasyonuyla tetiklenme demosu (wattox sim `setEstop` senaryosu) | sim + rules birleşik demo — ilk sahada | Orta |
| M4 | I-1 toprak bıçağı interlock'u | MV verisi yok (G-1) | Faz 1 |
| M5 | FL-04 zamanlı OTO başlatma (takvim deposu) | G-5 veri boşluğu | Faz 1 |
