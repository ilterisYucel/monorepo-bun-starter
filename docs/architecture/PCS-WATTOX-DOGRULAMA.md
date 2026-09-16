---
status: active
space: architecture
tags: [dogrulama, pcs, wattox, modbus, test]
review_date: 2026-09-15
---

# Wattox PCS — Doğrulama Dokümanı (Aşama 5/6)

Bağlı tasarım: [PCS-WATTOX-MIMARISI.md](./PCS-WATTOX-MIMARISI.md)

## 1. Genel Durum

| Görev | Durum | Kanıt |
|:------|:------|:------|
| T-P1/T-P3 — `validate.expect` ilişki uzantısı | ✅ | shared-types 7/7 + device-service 65/65 (+3 yeni ilişki testi) |
| T-P2 — `config-field/pcs-1.json` (159 telemetri, 11 bitfield, 8 komut) | ✅ | `config-field.test.ts` 8/8 |
| T-P4 — `wattox-pcs` simülatör + adapter | ✅ | `wattox-pcs.test.ts` 17/17 |
| T-P6 — field compose device-service | ✅ | compose config dev+prod geçerli |
| T-P7 — gözle kontrol | ✅ | canlı: PCS-1 poll + telemetri akışı (redis kuyruklarında) |

**Monorepo:** 1781/1781 test yeşil; `bun run build` başarılı.

## 2. Değişiklik Matrisi (satır referanslı)

| Değişiklik | Dosya | Test | Geçme |
|:-----------|:------|:-----|:------|
| `expectHolds`/`isRelationExpect` (negative/positive/zero/nonzero) | `packages/shared-types/src/commands/validate-expect.ts` (YENİ) + barrel | `validate-expect.test.ts` 7/7 | ✅ |
| Validation döngüsü `expectHolds` kullanır | `services/device-service/src/device-service.ts` (validate bloğu) | `device-service.test.ts` "validate.expect ilişki sözcükleri" 3 test | ✅ |
| Register haritası + durum makinesi (Stop→Standby→Charge/Discharge; şarj NEGATİF; anında komut uygulama) | `packages/simulators/src/wattox-pcs/{register-map,simulator,modbus-adapter,index}.ts` (YENİ) | `wattox-pcs.test.ts` 17/17 | ✅ |
| `bmsPort` şema/tipler | `packages/shared-types/src/{schemas/device-config.ts,config/device-config.ts}` | config-field testi | ✅ |
| `wattox-pcs` kaydı (SimulatorRegistry 1 satır) + `bmsPort` taşıma | `services/device-service/src/simulator-registry.ts` | — | ✅ |
| Field config + service.json | `config-field/{pcs-1,service}.json` (YENİ) | `config-field.test.ts` 8/8 | ✅ |
| Field compose device-service | `deployment/docker-compose.field.{yml,dev.yml}` | `docker compose config` | ✅ |

## 3. Kabul Kriteri Kanıtları

| Kod | Kriter | Sonuç |
|:----|:-------|:------|
| K-P1 | Config zod'dan geçer | ✅ |
| K-P2 | Register adres/tip/ölçek birebir (159 telemetri — A09+/B full/C65+/D full/S full) | ✅ config testi |
| K-P3 | Alarm bitfield'ları App.3'e göre (8 alarm sözcüğü + BMS word + DI + E-stop) | ✅ |
| K-P4 | Simülatör register doğruluğu + durum makinesi | ✅ 17/17 |
| K-P5 | Şarj negatif konvansiyonu (`-{{powerKw}}`) | ✅ config + CommandJobBuilder (platform/commands 15/15) |
| K-P6 | `set_command_source` komutu hazır | ✅ |
| K-P7 | Gözle: field device-service PCS-1'i okuyor | ✅ canlı loglar + redis kuyrukları |
| K-P8 | Kapılar: yeni kod ≥%70; bitfield/simülatör ≥%90 branch | ✅ wattox-pcs %91.8 satır |

## 4. Sapmalar

| Kod | Sapma | Etki |
|:----|:------|:-----|
| S1 | `validate.expect` ilişki sözcükleri şema yerine SADECE device-service döngüsünde değerlendiriliyor (zod değişmedi — expect zaten string kabul ediyor) | Geriye uyumlu; ilişki dışı string'ler birebir eşitlik |
| S2 | A87-A89 (versiyon/customer code) alınmadı — "A09'dan itibaren" kararı kapsamında metadata, önceliksiz | Config 159 telemetri |
| S3 | `set_power_zero` komutu eklendi (SPEC'te yoktu — FL-03 Idle'ın PCS aksiyonu olarak gerekli) | FL-03 için hazır |
| S4 | Fault word'leri (D01-D10) raw telemetri olarak; bitfield yalnızca ALARM sözcüklerine (kullanıcı kararı: App.3) | Fault bit analizi ileride |

## 5. Gözle Kontrol (2026-09-15)

- Field device-service yerel çalıştırıldı (config-field + wattox-pcs sim): "1 cihaz, PCS-1 (wattox-pcs)" + READ_DEVICE repeatable + MANAGEMENT/WS_BROADCAST/WRITE_TELEMETRY job akışı redis'te gözlendi.
- İlk çalıştırmada S16 raw-word dönüşüm hatası (`modbus_read_failed` — "Received -1725") yakalandı ve düzeltildi (raw16 dönüşümü) — düzeltme sonrası hata logu YOK.
- BMS bloğu connector Faz 2 ile doğrulandı (bkz. BSC-PCS-CONNECTOR-DOGRULAMA).

`review_date: 2026-09-15`
