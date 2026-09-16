---
status: active
space: architecture
tags: [dogrulama, manevra, field, pms, otomasyon, test]
review_date: 2026-09-15
---

# Field Manevra Kataloğu REV.01 — Doğrulama Dokümanı (Aşama 5/6)

Bağlı tasarım: [FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md](./FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md)

## 1. Genel Durum

| Görev | Durum | Kanıt |
|:------|:------|:------|
| T-M2 — REV.01 manevra kataloğu (11 manevra; 3 gizli) | ✅ | `field maneuvers.test.ts` 16/16 |
| T-M2 — grup seçimi + eşit dağıtım transform'u | ✅ | aynı test dosyası |
| T-M3 — FieldManeuverPanel: hidden filtresi + inputs/timerConfig + resolveSteps | ✅ | field 150/150; tsc temiz |
| T-M5 — R-06 recovery kuralı (field rules.json) | ✅ | `field-rules.test.ts` 4/4 |
| T-M4 — field compose: device-service + management-service | ✅ | compose config dev+prod geçerli |

**Monorepo:** 1781/1781 test yeşil; build başarılı.

## 2. Değişiklik Matrisi

| Değişiklik | Dosya | Geçme |
|:-----------|:------|:------|
| REV.01 kataloğu: FL-01 start/shutdown, FL-02 charge/discharge (rollback=stop), FL-03 idle (set_power_zero), FL-04 kalibrasyon (timer), FL-05 e-stop, FL-11 maintenance + GİZLİ FL-06/07/10 | `apps/field/src/features/field-control/maneuvers.ts` | ✅ |
| `FIELD_HIDDEN_MANEUVER_NAMES` + `buildFieldManeuverControls` (grup indeksi + güç + dağıtım) + `resolveSteps` | aynı dosya | ✅ |
| Panel: hidden filtresi + inputs/timerConfig + onRun values + resolveSteps | `FieldManeuverPanel.tsx` | ✅ |
| i18n (tr/en) — 24 yeni anahtar | `apps/field/src/i18n/{tr,en}.ts` | ✅ |
| R-06 kural dosyası | `services/management-service/deployment/config-field/rules.json` (YENİ) | ✅ |
| Field compose: management-service (dev+prod) | `deployment/docker-compose.field.{yml,dev.yml}` | ✅ |

## 3. Kabul Kriteri Kanıtları

| Kod | Kriter | Sonuç |
|:----|:-------|:------|
| K-M1 | REV.01 kart seti; FL-06/07/10 görünmez (hidden set + panel filtresi) | ✅ test + kod |
| K-M2 | Grup seçimi + eşit dağıtım transform'u | ✅ 4 resolveSteps testi |
| K-M3 | Şarj NEGATİF konvansiyonu uçtan uca (config `-{{powerKw}}` + CommandJobBuilder işaret öneki) | ✅ PCS config testi + platform/commands 15/15 |
| K-M4 | R-06: E-stop düşen kenar → fault_reset + standby; şarj/deşarj ASLA otomatik yüklenmez | ✅ field-rules testi (aksiyon filtre assert'i) |
| K-M5 | I-1 interlock (toprak bıçağı) — MV verisi yok: komut katmanına ALINMADI, dokümante (boşluk G-1) | ⏳ veri beklenir |
| K-M6 | Field compose'da device-service + PCS config çalışır | ✅ gözle (PCS-WATTOX-DOGRULAMA §5) |
| K-M7 | Kapılar | ✅ |

## 4. Sapmalar (onaylı)

| Kod | Sapma | Neden |
|:----|:------|:------|
| S10 | Grup seçimi **sayısal indeks** (-1 = santral; 0..N-1 = pcsIds[i]) — ManeuverCard/InputField DEĞİŞMEDİ (string option desteği ui'a dokunmadan) | ManeuverCard girişleri `Record<string, number>`; ui genişletmesi ayrı iş |
| S11 | FL-03 idle = `set_power_zero` tek adım (standby ayrı adım DEĞİL) | PCS sim'de setpoint 0 → Standby zaten (durum makinesi); tek komut yeterli |
| S12 | FL-04 kalibrasyon kartı PCS standby adımı taşır (PMS yaşam döngüsünün ön koşulu); iç algoritma DC Block'ta — SPEC'te belirtildiği gibi | — |
| S13 | FL-02 dağıtım paydası = adım sayısı (online PCS filtresi pcsIds'in üretildiği yerde — panel mock'tan online listesi çeker) | backend kayıt defteri gelince online filtresi orada olacak |
| S14 | R-06 yalnızca PCS-1'e yazılı — N konteyner için kural başına PCS-<N> şablonu (ya da `types:["pcs"]` + tüm-PCS aksiyonları) uygulama gününde genişler | 1 konteyner MVP |

## 5. Gözle Kontrol

- Field app testleri (150/150) + vitest workspace yeşil; i18n anahtarları tr/en eklenmiş.
- R-06 kural dosyası RuleConfigLoader ile canlı yüklenir (field-rules.test 4/4 — fail-fast parse).
- Field compose (dev+prod) `docker compose config` doğrulaması geçti.
- E2E (saha stack canlı + R-06 tetikleme) ilk sahada devreye alımda yapılacak — K-M5 (MV interlock) veri boşluğu giderilince.

`review_date: 2026-09-15`
